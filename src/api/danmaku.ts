import axios from 'axios';
// @ts-ignore — resolved to bundler entry via vite alias
import { cut } from 'jieba-wasm';

export interface IDanmakuComment {
    p: string; // "时间,类型,字号,颜色"
    m: string; // 弹幕内容
}

export interface IEpisodeInfo {
    episodeId: number;
    episodeTitle: string;
}

export interface IAnimeSearchResult {
    animeId: number;
    animeTitle: string;
    episodes: IEpisodeInfo[];
}

export interface IArtplayerDanmuku {
    text: string;
    time: number;
    color?: string;
    mode?: number;
}

export interface ISearchHint {
    name: string;
    actor?: string;
    director?: string;
    year?: string;
}

async function doSearch(keyword: string): Promise<IAnimeSearchResult[]> {
    try {
        const { data } = await axios.get('/danmaku/api/v2/search/episodes', {
            params: { anime: keyword },
        });
        return data?.animes ?? [];
    } catch {
        return [];
    }
}

/**
 * Stop words for filtering: language tags, common suffixes, short particles
 */
const STOP_WORDS = new Set([
    '版', '的', '之', '了', '在', '是', '我', '有', '和', '与',
    '粤语', '国语', '英语', '日语', '韩语', '中字', '中英', '原声', '配音',
    '电影', '电视剧', '动漫', '综艺', '纪录片',
]);

/**
 * Extract core title from vod_name using jieba segmentation.
 * Filters out stop words, year numbers, and person names (from actor/director hints).
 * Falls back to regex stripping if jieba is not ready.
 */
function extractBaseName(name: string): string {
    return name
        .replace(/\d{4}$/, '')
        .replace(/\s*\d+\s*$/, '')
        .replace(/(粤语|国语|英语|日语|韩语|中字|中英|原声|配音)版?$/g, '')
        .replace(/[^\s]*版(粤语|国语|英语|日语|韩语|中字|中英|原声|配音)?$/g, '')
        .trim();
}

/**
 * Use jieba to segment vod_name and produce a clean core title.
 * Removes stop words, year-like tokens, and known person names.
 */
function segmentCoreName(name: string, knownNames: string[] = []): string {
    try {
        const words = cut(name, true);
        const nameSet = new Set(knownNames.filter(Boolean));
        const coreWords = words.filter((w: string) => {
            if (w.trim().length === 0) return false;
            if (STOP_WORDS.has(w)) return false;
            if (/^\d{4}$/.test(w)) return false;
            if (/^\d+$/.test(w)) return false;
            if (nameSet.has(w)) return false;
            return true;
        });
        return coreWords.join('') || extractBaseName(name);
    } catch {
        return extractBaseName(name);
    }
}

/**
 * Pick the best match from results by year
 */
function pickByYear(results: IAnimeSearchResult[], year?: string): IAnimeSearchResult | undefined {
    if (!year || !results.length) return results[0];
    const yearMatch = results.find((r) => titleMatchesYear(r.animeTitle, year));
    return yearMatch ?? results[0];
}

/**
 * Check if a candidate title matches the expected year.
 * Supports formats: "(2006)", "（2006）", title ending with "2006", etc.
 */
function titleMatchesYear(title: string, year: string): boolean {
    // Exact bracket formats: (2006) or （2006）
    if (title.includes(`(${year})`) || title.includes(`（${year}）`)) return true;
    // Title contains the year as a standalone segment (surrounded by non-digit or at boundary)
    const re = new RegExp(`(?:^|\\D)${year}(?:\\D|$)`);
    return re.test(title);
}

/**
 * Score a candidate: lower is better.
 * Priority: year match > episode count closeness.
 */
function scoreCandidate(r: IAnimeSearchResult, year?: string, expected?: number): number {
    let score = 0;
    // Year mismatch penalty
    if (year && !titleMatchesYear(r.animeTitle, year)) score += 1000;
    // Episode count distance
    const count = r.episodes?.length ?? 0;
    if (expected && count > 0) {
        score += Math.abs(count - expected);
    } else if (expected) {
        score += 9999; // no episodes at all
    }
    return score;
}

/**
 * Search episodes with multiple strategies, collecting all candidates then picking the best.
 * @param hint - search hints (name, actor, director, year)
 * @param expectedEpisodes - expected episode count from detail API (vod_play_url_parse.length)
 *
 * Strategies (in order):
 * 1. Exact vod_name (e.g. "神雕侠侣2006")
 * 2. Base name + lead actor (e.g. "神雕侠侣 黄晓明")
 * 3. Base name + director (e.g. "神雕侠侣 于敏")
 * 4. Base name only (e.g. "神雕侠侣")
 *
 * All results are pooled, deduplicated by animeId, scored, and the best one is returned.
 * If the best candidate's episode count still doesn't match (> 10% off), it is returned
 * as a fallback anyway (best effort).
 */
export async function searchEpisodes(
    hint: ISearchHint,
    expectedEpisodes?: number,
): Promise<IAnimeSearchResult[]> {
    const { name, actor, director, year } = hint;

    // Collect known person names for filtering
    const knownNames = [
        ...(actor?.split(/[,，]/).map((s) => s.trim()) ?? []),
        ...(director?.split(/[,，]/).map((s) => s.trim()) ?? []),
    ];

    const coreName = segmentCoreName(name, knownNames);
    const leadActor = actor?.split(/[,，]/)[0]?.trim();

    // Collect all candidates (deduplicated by animeId)
    const seen = new Set<number>();
    const candidates: IAnimeSearchResult[] = [];
    const addResults = (results: IAnimeSearchResult[]) => {
        for (const r of results) {
            if (!seen.has(r.animeId)) {
                seen.add(r.animeId);
                candidates.push(r);
            }
        }
    };

    // Build all search keywords in advance, then fire in parallel
    const keywordSet = new Set<string>();
    const keywords: string[] = [];
    const addKeyword = (kw: string) => {
        if (kw && !keywordSet.has(kw)) {
            keywordSet.add(kw);
            keywords.push(kw);
        }
    };

    // Strategy 1: exact name
    addKeyword(name);
    // Strategy 2: core name + lead actor
    if (leadActor) {
        addKeyword(`${coreName} ${leadActor}`);
    }
    // Strategy 3: core name + director
    if (director) {
        const leadDirector = director.split(/[,，]/)[0]?.trim();
        if (leadDirector) {
            addKeyword(`${coreName} ${leadDirector}`);
        }
    }
    // Strategy 4: core name only (jieba segmented)
    addKeyword(coreName);

    const allResults = await Promise.all(keywords.map((kw) => doSearch(kw)));
    for (const results of allResults) {
        addResults(results);
    }

    if (!candidates.length) return [];

    // No episode constraint: pick by year
    if (!expectedEpisodes) {
        return [pickByYear(candidates, year) ?? candidates[0]];
    }

    // Sort by score (lower is better), pick the best
    candidates.sort((a, b) => scoreCandidate(a, year, expectedEpisodes) - scoreCandidate(b, year, expectedEpisodes));

    console.log(
        '[danmaku] candidates:',
        candidates.map((c) => ({
            id: c.animeId,
            title: c.animeTitle,
            eps: c.episodes?.length ?? 0,
            score: scoreCandidate(c, year, expectedEpisodes),
        })),
    );
    console.log('[danmaku] picked:', candidates[0].animeTitle, 'episodes:', candidates[0].episodes?.length);

    return [candidates[0]];
}

export async function getComments(episodeId: number): Promise<IDanmakuComment[]> {
    try {
        const { data } = await axios.get(`/danmaku/api/v2/comment/${episodeId}`, {
            params: { format: 'json' },
        });
        return data?.comments ?? [];
    } catch {
        console.warn('[danmaku] Failed to get comments for episode:', episodeId);
        return [];
    }
}

/**
 * Transform danmu_api comments to artplayer-plugin-danmuku format
 * p format: "time,type,fontSize,color"
 * type: 1=scroll, 4=bottom, 5=top -> mode: 0=scroll, 1=top, 2=bottom
 */
export function transformToArtplayerDanmuku(comments: IDanmakuComment[]): IArtplayerDanmuku[] {
    return comments
        .map((c) => {
            const parts = c.p.split(',');
            const time = parseFloat(parts[0]) || 0;
            const type = parseInt(parts[1]) || 1;
            const colorNum = parseInt(parts[3]) || 16777215;
            const color = '#' + colorNum.toString(16).padStart(6, '0');

            let mode = 0; // scroll
            if (type === 5) mode = 1; // top
            else if (type === 4) mode = 2; // bottom

            return { text: c.m, time, color, mode };
        })
        .sort((a, b) => a.time - b.time);
}
