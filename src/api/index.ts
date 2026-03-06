import axios from 'axios';

export interface IVodItem {
    vod_id: string;
    vod_name: string;
    type_id: string;
    type_name: string;
    vod_en: string;
    vod_time: string;
    vod_remarks: string;
    vod_play_from: string;
}

export interface IResponseData<T> {
    page: number;
    pagecount: number;
    limit: number;
    total: number;
    list: T[];
}

export interface IDetailData {
    vod_time: string;
    vod_id: string;
    vod_name: string;
    vod_enname: string;
    vod_sub: string;
    vod_letter: string;
    vod_color: string;
    vod_tag: string;
    vod_class: string;
    type_id: string;
    type_name: string;
    vod_pic: string;
    vod_lang: string;
    vod_area: string;
    vod_year: string;
    vod_remarks: string;
    vod_actor: string;
    vod_director: string;
    vod_serial: string;
    vod_isend: number;
    vod_lock: string;
    vod_level: string;
    vod_hits: string;
    vod_hits_day: string;
    vod_hits_week: string;
    vod_hits_month: string;
    vod_duration: string;
    vod_up: string;
    vod_down: string;
    vod_score: string;
    vod_score_all: string;
    vod_score_num: string;
    vod_points_play: string;
    vod_points_down: string;
    vod_content: string;
    vod_play_from: string;
    vod_play_note: string;
    vod_play_server: string;
    vod_play_url: string;
    vod_play_url_parse: string[];
}

export async function getList(
    wd: string,
    pg?: number,
): Promise<IResponseData<IVodItem> & { code: number; redirectHtmlData?: string }> {
    const res = await axios.get('/inc/api_mac10.php', {
        params: {
            wd,
            pg,
        },
    });
    return res.data;
}

export async function getDetail(ids: string): Promise<IResponseData<IDetailData>> {
    const { data } = await axios.get('/inc/api_mac10.php', {
        params: {
            ac: 'detail',
            ids,
        },
    });
    return data;
}
