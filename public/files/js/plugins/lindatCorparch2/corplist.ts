/*
 * Copyright (c) 2015 Institute of the Czech National Corpus
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; version 2
 * dated June, 1991.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { Kontext } from '../../types/common';
import { PluginInterfaces, IPluginApi } from '../../types/plugins';
import { MultiDict } from '../../multidict';
import * as common from './common';
import { CorpusInfo, CorpusInfoType, CorpusInfoResponse } from '../../models/common/layout';
import { StatelessModel, IActionDispatcher, Action, SEDispatcher } from 'kombo';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { List, pipe, HTTP, tuple } from 'cnc-tskit';
import { Actions, ActionName } from './actions';


interface SetFavItemResponse extends Kontext.AjaxResponse {

    /**
     * An id of a newly created favorite item
     */
    id:string;
}


export interface Filters {
    maxSize?:string;
    minSize?:string;
    name?:string;
    sortBySize?:string;
    query?:string;
    corpusName?:string;
}

export interface CorplistServerData {
    rows:Array<common.CorplistItem>;
    search_params:{
        filters:Filters;
        keywords:Array<[string, string, boolean, string]>;
    };
    nextOffset:number;
    filters:Filters;
    keywords:Array<string>;
    query:string;
    current_keywords:any;
}

export interface CorplistDataResponse extends Kontext.AjaxResponse {
    nextOffset:number;
    current_keywords:Array<string>;
    filters:Filters;
    keywords:Array<string>;
    rows:Array<common.CorplistItem>;
}


export interface KeywordInfo {
    ident:string;
    label:string;
    color:string;
    visible:boolean;
    selected:boolean;
}

const importKeywordInfo = (preselected:Array<string>) =>
        (v:[string, string, boolean, string]):KeywordInfo => {
    return {
        ident: v[0],
        label: v[1],
        color: v[3],
        visible: true,
        selected: preselected.indexOf(v[0]) > -1
    };
}


export interface CorplistTableModelState {

    filters:Filters;

    keywords:Array<KeywordInfo>;

    detailData:CorpusInfo;

    isBusy:boolean;

    searchedCorpName:string;

    offset:number;

    nextOffset:number;

    limit:number;

    rows:Array<common.CorplistItem>;
}


/**
 * This model handles table dataset
 */
export class CorplistTableModel extends StatelessModel<CorplistTableModelState> {

    protected pluginApi:IPluginApi;

    protected tagPrefix:string;

    /**
     *
     * @param pluginApi
     */
    constructor(
        dispatcher:IActionDispatcher,
        pluginApi:IPluginApi,
        initialData:CorplistServerData,
        preselectedKeywords:Array<string>
    ) {
        super(
            dispatcher,
            {
                filters: { maxSize: '', minSize: '', name: '', sortBySize: 'name'},
                keywords: List.map(
                    importKeywordInfo(preselectedKeywords),
                    initialData.search_params.keywords
                ),
                detailData: null,
                isBusy: false,
                offset: 0,
                limit: pluginApi.getConf('pluginData')['corparch']['max_page_size'],
                searchedCorpName: '',
                nextOffset: initialData.nextOffset,
                rows: initialData.rows
            }
        );
        this.pluginApi = pluginApi;
        this.tagPrefix = this.pluginApi.getConf('pluginData')['corparch']['tag_prefix'];
        this.handleLoad = this.handleLoad.bind(this);

        this.addActionHandler<Actions.LoadDataDone>(
            ActionName.LoadDataDone,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    this.pluginApi.showMessage('error', action.error);

                } else {
                    this.importData(state, action.payload.data);
                }
            }
        );

        this.addActionHandler<Actions.LoadExpansionDataDone>(
            ActionName.LoadExpansionDataDone,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    this.pluginApi.showMessage('error', action.error);

                } else {
                    this.extendData(state, action.payload.data);
                }
            }
        );

        this.addActionHandler<Actions.KeywordClicked>(
            ActionName.KeywordClicked,
            (state, action) => {
                state.offset = 0;
                if (!action.payload.ctrlKey) {
                    state.keywords = List.map(v => ({
                        ident: v.ident,
                        label: v.label,
                        color: v.color,
                        visible: v.visible,
                        selected: false
                    }), state.keywords);
                }
                const idx = state.keywords.findIndex(v => v.ident === action.payload.keyword);
                const v = state.keywords[idx];
                state.keywords[idx] = {
                    ident: v.ident,
                    label: v.label,
                    color: v.color,
                    visible: v.visible,
                    selected: !v.selected
                };
                state.isBusy = true;
            },
            this.handleLoad
        );

        this.addActionHandler<Actions.KeywordResetClicked>(
            ActionName.KeywordResetClicked,
            (state, action) => {
                state.offset = 0;
                state.keywords = List.map(v => ({
                    ident: v.ident,
                    label: v.label,
                    color: v.color,
                    visible: v.visible,
                    selected: false
                }), state.keywords);
                state.isBusy = true;
            },
            this.handleLoad
        );

        this.addActionHandler<Actions.ExpansionClicked>(
            ActionName.ExpansionClicked,
            (state, action) => {
                if (action.payload.offset) {
                    state.offset = action.payload.offset;
                }
                state.isBusy = true;
            },
            (state, action, dispatch) => {
                this.loadData(
                    this.exportQuery(state),
                    this.exportFilter(state),
                    state.offset
                ).subscribe(
                    (data) => {
                        dispatch<Actions.LoadExpansionDataDone>({
                            name: ActionName.LoadExpansionDataDone,
                            payload: {data}
                        });
                    },
                    (err) => {
                        dispatch<Actions.LoadExpansionDataDone>({
                            name: ActionName.LoadExpansionDataDone,
                            error: err
                        });
                    }
                );
            }
        );

        this.addActionHandler<Actions.FilterChanged>(
            ActionName.FilterChanged,
            (state, action) => {
                state.offset = 0;
                if (action.payload.corpusName) {
                    state.searchedCorpName = action.payload.corpusName;
                    delete action.payload.corpusName;
                }
                this.updateFilter(state, action.payload as Filters);
                state.isBusy = true;
            },
            this.handleLoad
        );

        this.addActionHandler<Actions.ListStarClicked>(
            ActionName.ListStarClicked,
            (state, action) => {
                state.isBusy = true;
            },
            (state, action, dispatch) => {
                this.changeFavStatus(
                    action.payload.corpusId,
                    action.payload.favId
                ).subscribe(
                    ([itemId, itemAction]) => {
                        if (itemAction === 'add') {
                            this.pluginApi.showMessage('info',
                                this.pluginApi.translate('defaultCorparch__item_added_to_fav'));

                        } else {
                            this.pluginApi.showMessage('info',
                            this.pluginApi.translate('defaultCorparch__item_removed_from_fav'));
                        }
                        dispatch<Actions.ListStarClickedDone>({
                            name: ActionName.ListStarClickedDone,
                            payload: {
                                corpusId: action.payload.corpusId,
                                newId: itemId,
                                action: itemAction
                            }
                        });
                    },
                    (err) => {
                        this.pluginApi.showMessage('error', err);
                        dispatch<Actions.ListStarClickedDone>({
                            name: ActionName.ListStarClickedDone,
                            error: err
                        });
                    }
                );
            }
        );

        this.addActionHandler<Actions.ListStarClickedDone>(
            ActionName.ListStarClickedDone,
            (state, action) => {
                state.isBusy = false;
                if (!action.error) {
                    if (action.payload.action === 'add') {
                        this.updateDataItem(
                            state,
                            action.payload.corpusId,
                            action.payload.newId
                        );

                    } else {
                        this.updateDataItem(
                            state,
                            action.payload.corpusId,
                            null
                        );
                    }
                }
            }
        );

        this.addActionHandler<Actions.CorpusInfoRequired>(
            ActionName.CorpusInfoRequired,
            (state, action) => {
                state.isBusy = true;
                state.detailData = this.createEmptyDetail(); // to force view to show detail box
            },
            (state, action, dispatch) => {
                this.loadCorpusInfo(action.payload.corpusId).subscribe(
                    (data) => {
                        dispatch<Actions.CorpusInfoLoaded>({
                            name: ActionName.CorpusInfoLoaded,
                            payload: {...data, type: CorpusInfoType.CORPUS}
                        });
                    },
                    (err) => {
                        dispatch<Actions.CorpusInfoLoaded>({
                            name: ActionName.CorpusInfoLoaded,
                            error: err
                        });
                    }
                );
            }
        );

        this.addActionHandler<Actions.CorpusInfoLoaded>(
            ActionName.CorpusInfoLoaded,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    this.pluginApi.showMessage('error', action.error);

                } else {
                    state.detailData = action.payload;
                }
            }
        );

        this.addActionHandler<Actions.CorpusInfoClosed>(
            ActionName.CorpusInfoClosed,
            (state, action) => {
                state.detailData = null;
            }
        );
    }

    handleLoad(state:CorplistTableModelState, action:Action, dispatch:SEDispatcher):void {
        this.loadData(this.exportQuery(state), this.exportFilter(state), state.offset).subscribe(
            (data) => {
                dispatch<Actions.LoadDataDone>({
                    name: ActionName.LoadDataDone,
                    payload: {data}
                });
            },
            (err) => {
                dispatch<Actions.LoadDataDone>({
                    name: ActionName.LoadDataDone,
                    error: err
                });
            }
        );
    }

    public exportFilter(state:CorplistTableModelState):Filters {
        return state.filters;
    }

    protected updateFilter(state:CorplistTableModelState, filter:Filters):void {
        for (let p in filter) {
            if (filter.hasOwnProperty(p)) {
                state.filters[p] = filter[p];
            }
        }
    }

    exportQuery(state:CorplistTableModelState):string {
        const q = pipe(
            state.keywords,
            List.filter(v => v.selected && v.visible),
            List.map(v => this.tagPrefix + v.ident)
        );
        if (state.searchedCorpName) {
            return q.concat(state.searchedCorpName).join(' ');
        }
        return q.join(' ');
    }

    getKeywordState(state:CorplistTableModelState, keyword:string):boolean {
        return state.keywords.find(v => v.ident === keyword) !== undefined;
    }

    private createEmptyDetail():CorpusInfo {
        return {
            type: CorpusInfoType.CORPUS,
            attrlist: [],
            structlist: [],
            citation_info: {
                type: CorpusInfoType.CITATION,
                corpname: null,
                article_ref: [],
                default_ref: null,
                other_bibliography: null
            },
            corpname: null,
            description: null,
            size: null,
            web_url: null,
            keywords: []
        };
    }

    private changeFavStatus(corpusId:string, favId:string):Observable<[string, 'add'|'remove']> {
        return favId === null ?
             this.pluginApi.ajax$<SetFavItemResponse>(
                HTTP.Method.POST,
                this.pluginApi.createActionUrl('user/set_favorite_item'),
                {
                    subcorpus_id: null,
                    subcorpus_orig_id: null,
                    corpora:[corpusId]
                }
            ).pipe(map(v => tuple(v.id, 'add'))) :
            this.pluginApi.ajax$<SetFavItemResponse>(
                HTTP.Method.POST,
                this.pluginApi.createActionUrl('user/unset_favorite_item'),
                {id: favId}

            ).pipe(map(v => tuple(v.id, 'remove')));
    }

    private loadCorpusInfo(corpusId:string):Observable<CorpusInfoResponse> {
        return this.pluginApi.ajax$<CorpusInfoResponse>(
            HTTP.Method.GET,
            this.pluginApi.createActionUrl('corpora/ajax_get_corp_details'),
            {
                corpname: corpusId
            }
        );
    }

    private loadData(
        query:string,
        filters:Filters,
        offset:number,
        limit?:number
    ):Observable<CorplistDataResponse> {
        const args = new MultiDict();
        args.set('query', query);
        args.set('offset', offset);
        if (limit !== undefined) {
            args.set('limit', limit);
        }
        if (filters) {
            for (let p in filters) {
                args.set(p, filters[p]);
            }
        }
        args.set('requestable', '1');
        return this.pluginApi.ajax$<CorplistDataResponse>(
            HTTP.Method.GET,
            this.pluginApi.createActionUrl('corpora/ajax_list_corpora'),
            args
        );
    }

    protected updateDataItem(state:CorplistTableModelState, corpusId:string, data:string|null):void {
        const srch = List.find(v => v.corpus_id === corpusId, state.rows);
        if (srch) {
            srch.fav_id = data;
        }
    }

    isFav(state:CorplistTableModelState, corpusId:string):boolean {
        return state.rows.some((item:common.CorplistItem) => {
            if (item.id === corpusId) {
                return item.fav_id !== null;
            }
            return false;
        });
    }

    private importData(state:CorplistTableModelState, inData:CorplistDataResponse):void {
        state.rows = inData.rows;
        state.keywords = List.map(v => ({
            ident: v.ident,
            label: v.label,
            color: v.color,
            visible: true, // currently we do not make visual taglist filtering
            selected: v.selected
        }), state.keywords);
        state.nextOffset = inData.nextOffset;
        state.filters = {
            maxSize: inData.filters.maxSize,
            minSize: inData.filters.minSize,
            name: inData.filters.name,
            sortBySize: inData.filters.sortBySize
        };
    }

    private extendData(state:CorplistTableModelState, data:CorplistDataResponse):void {
        state.filters = {
            maxSize: data.filters.maxSize,
            minSize: data.filters.minSize,
            name: data.filters.name,
            sortBySize: data.filters.sortBySize
        };
        state.nextOffset = data.nextOffset;
        state.rows = List.concat(data.rows, state.rows);
    }
}

/**
 * Corplist page 'model'.
 */
export class CorplistPage implements PluginInterfaces.Corparch.ICorplistPage  {

    components:any;

    private pluginApi:IPluginApi;

    protected corplistTableModel:CorplistTableModel;

    constructor(
        pluginApi:IPluginApi,
        initialData:CorplistServerData,
        viewsInit:((...args:any[])=>any)
    ) {

        this.pluginApi = pluginApi;
        this.corplistTableModel = new CorplistTableModel(pluginApi.dispatcher(),
            pluginApi, initialData,
            pluginApi.getConf('pluginData')['corparch']['initial_keywords'] || []);
        this.components = viewsInit(this.corplistTableModel);
    }

    getForm():React.ComponentClass {
        return this.components.FilterForm;
    }

    getList():React.ComponentClass {
        return this.components.CorplistTable;
    }
}
