import axios from 'axios';

// jieba-wasm 懒加载：3.8MB WASM 不静态打入 DetailView chunk，首次 searchEpisodes 时才动态加载
let jiebaCut: ((text: string, hmm?: boolean) => string[]) | null = null;
let jiebaPromise: Promise<void> | null = null;

async function ensureJieba(): Promise<void> {
    if (jiebaCut) return;
    if (!jiebaPromise) {
        jiebaPromise = (async () => {
            // @ts-ignore — resolved to bundler entry via vite alias
            // eslint-disable-next-line camelcase -- jieba-wasm API uses snake_case
            const jieba = await import('jieba-wasm');
            const { DICT_TEXT } = await import('./danmaku-dict');
            // 一次性注入影视专用词典，让 jieba 能识别"第一季"、"国语"、"剧场版"等后缀为独立词。
            // with_dict 是增量式（不清空默认词典），同步执行，模块加载时调用一次即可。
            jieba.with_dict(DICT_TEXT);
            jiebaCut = jieba.cut;
        })();
    }
    await jiebaPromise;
}

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
    mode?: 0 | 1 | 2;
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
 * Season words (第一季~第十二季 / 第一部~第十二部) for STOP_WORDS.
 * Numeric forms like "第1季" are handled by regex stripping in extractBaseName.
 */
const SEASON_NUMBERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const SEASON_WORDS = SEASON_NUMBERS.flatMap((n) => [`第${n}季`, `第${n}部`]);

/**
 * Stop words for filtering: language tags, version tags, type markers, season markers, common particles.
 * All entries here must also be present in DICT_TEXT so jieba can segment them as independent words.
 */
const STOP_WORDS = new Set<string>([
    '版', '的', '之', '了', '在', '是', '我', '有', '和', '与',
    // 语言/字幕
    '粤语', '国语', '英语', '日语', '韩语', '中字', '中英', '原声', '配音', '双语', '字幕',
    // 类型
    '电影', '电视剧', '动漫', '综艺', '纪录片',
    '剧场版', '特别篇', '番外篇', '大结局', '最终章', '上部', '下部', '正片', '预告',
    'OVA', 'TV版', 'WEB版',
    // 版本
    '高清', '修复版', '导演版', '完整版', '未删减版', '重制版', '纪念版', '蓝光',
    // 季数（数字"第N季"由正则剥离兜底）
    'Season',
    ...SEASON_WORDS,
]);

/**
 * Suffix patterns to strip from the tail of a title, applied recursively.
 * Covers season markers, language tags, version tags, type markers, year, trailing digits.
 * Acts as a fallback when jieba segmentation cannot isolate the suffix words.
 */
const SUFFIX_PATTERNS = [
    /第[一二三四五六七八九十\d]+[季部]$/, // 第一季 / 第1部
    /Season\s*\d+$/i, // Season 1
    /S\d{1,2}$/, // S1, S12
    /[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]$/, // 罗马数字
    /(国语|粤语|英语|日语|韩语|中字|中英|原声|配音|双语|字幕)版?$/, // 语言/字幕
    /(高清|修复版|导演版|完整版|未删减版|重制版|纪念版|蓝光)$/, // 版本
    /(剧场版|特别篇|番外篇|大结局|最终章|上部|下部|正片|预告|OVA|TV版|WEB版)$/, // 类型
    /\d{4}$/, // 年份
    /\s*\d+\s*$/, // 末尾数字
];

/**
 * Recursively strip known suffixes from the tail of `name` until stable.
 * Capped at 5 iterations to guard against pathological input.
 * Returns the stripped result, or the original name if stripping yields empty.
 */
function extractBaseName(name: string): string {
    let prev: string;
    let cur = name.trim();
    let i = 0;
    do {
        prev = cur;
        for (const re of SUFFIX_PATTERNS) {
            cur = cur.replace(re, '').trim();
        }
    } while (cur !== prev && ++i < 5);
    return cur || name.trim();
}

/**
 * Use jieba to segment vod_name and produce a clean core title.
 * Removes stop words, year-like tokens, and known person names.
 *
 * With the custom dict injected, jieba can now isolate "第一季", "国语" etc. as
 * independent words, so STOP_WORDS filtering actually takes effect.
 *
 * Fallback chain:
 *   1. jieba cut + STOP_WORDS filter (preferred — most accurate)
 *   2. extractBaseName recursive suffix stripping (regex fallback for edge cases)
 *   3. original name (last resort, never return empty)
 */
async function segmentCoreName(name: string, knownNames: string[] = []): Promise<string> {
    const fallback = extractBaseName(name);
    try {
        await ensureJieba();
        if (!jiebaCut) return fallback || name;
        const words = jiebaCut(name, true);
        const nameSet = new Set(knownNames.filter(Boolean));
        const coreWords = words.filter((w: string) => {
            if (w.trim().length === 0) return false;
            if (STOP_WORDS.has(w)) return false;
            if (/^\d{4}$/.test(w)) return false;
            if (/^\d+$/.test(w)) return false;
            if (nameSet.has(w)) return false;
            return true;
        });
        const joined = coreWords.join('').trim();
        // jieba 过滤后非空、且与原 name 不同（说明确实切出了噪声词）则用 jieba 结果；
        // 再用 extractBaseName 做最终清理，处理"国语版"这种 jieba 切成整体词但 STOP_WORDS 未覆盖的情况。
        // 否则回退到正则递归剥离。极端情况下回退到原 name，避免返回空串导致搜索策略失效。
        if (joined && joined !== name) return extractBaseName(joined) || joined;
        return fallback || name;
    } catch {
        return fallback || name;
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

    const coreName = await segmentCoreName(name, knownNames);
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

            let mode: 0 | 1 | 2 = 0; // scroll
            if (type === 5) mode = 1; // top
            else if (type === 4) mode = 2; // bottom

            return { text: c.m, time, color, mode };
        })
        .sort((a, b) => a.time - b.time);
}
