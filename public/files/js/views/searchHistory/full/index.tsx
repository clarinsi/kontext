/*
 * Copyright (c) 2017 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2017 Tomas Machalek <tomas.machalek@gmail.com>
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

import * as React from 'react';
import { Bound, IActionDispatcher } from 'kombo';
import { Keyboard, Dict, pipe, List } from 'cnc-tskit';

import { Kontext } from '../../../types/common';
import { Actions, ActionName } from '../../../models/searchHistory/actions';
import { QueryType } from '../../../models/query/query';

import * as S from './style';
import { SearchHistoryModelState, QueryHistoryItem } from '../../../models/searchHistory/common';
import { SearchHistoryModel } from '../../../models/searchHistory';
import gearIcon from '../../../../img/config-icon.svg';
import gearIconS from '../../../../img/config-icon_s.svg';


export interface HistoryViews {
    RecentQueriesPageList:React.ComponentClass<{}>;
}


export function init(dispatcher:IActionDispatcher, he:Kontext.ComponentHelpers,
            queryHistoryModel:SearchHistoryModel):HistoryViews {

    const layoutViews = he.getLayoutViews();

    const supertypeToHuman = (qSupertype:Kontext.QuerySupertype) => {
        switch (qSupertype) {
            case 'conc':
                return he.translate('qhistory__qs_conc');
            case 'pquery':
                return he.translate('qhistory__qs_pquery');
            case 'wlist':
                return he.translate('qhistory__qs_wlist');
        }
    };

    const typeToHuman = (qtype:QueryType) => {
        return qtype === 'advanced' ?
            he.translate('query__qt_advanced') :
            he.translate('query__qt_simple');
    };

    // -------------------- <QueryTypeSelector /> ------------------------

    const SearchKindSelector:React.FC<{
        value:Kontext.QuerySupertype;

    }> = (props) => {

        const handleChange = (evt) => {
            dispatcher.dispatch<Actions.HistorySetQuerySupertype>({
                name: ActionName.HistorySetQuerySupertype,
                payload: {
                    value: evt.target.value
                }
            });
        };

        return (
            <select value={props.value} onChange={handleChange}>
                <option value="">
                    {he.translate('qhistory__qs_any')}
                </option>
                {List.map(
                    v => <option key={v} value={v}>{supertypeToHuman(v)}</option>,
                    ['conc', 'pquery', 'wlist'] as Array<Kontext.QuerySupertype>
                )}
            </select>
        );
    };

    // -------------------- <CurrentCorpCheckbox /> ------------------------

    const CurrentCorpCheckbox:React.FC<{
        value:boolean;

    }> = (props) => {

        const handleChange = () => {
            dispatcher.dispatch<Actions.HistorySetCurrentCorpusOnly>({
                name: ActionName.HistorySetCurrentCorpusOnly,
                payload: {
                    value: !props.value
                }
            });
        };
        return <input type="checkbox" checked={props.value} onChange={handleChange}
                    style={{verticalAlign: 'middle'}} />;
    };

    // -------------------- <ArchivedOnlyCheckbox /> ------------------------

    const ArchivedOnlyCheckbox:React.FC<{
        value:boolean;

    }> = (props) => {
        const handleChange = () => {
            dispatcher.dispatch<Actions.HistorySetArchivedOnly>({
                name: ActionName.HistorySetArchivedOnly,
                payload: {
                    value: !props.value
                }
            });
        };

        return <input type="checkbox" checked={props.value} onChange={handleChange}
                    style={{verticalAlign: 'middle'}} />;
    }


    // -------------------- <FilterForm /> ------------------------

    const FilterForm:React.FC<{
        corpname:string;
        currentCorpusOnly:boolean;
        querySupertype:Kontext.QuerySupertype;
        archivedOnly:boolean;

    }> = (props) => {
        return (
            <S.FilterForm>
                <fieldset>
                    <legend>
                        {he.translate('qhistory__filter_legend')}
                    </legend>
                    <label>
                        {he.translate('qhistory__curr_corp_only_label_{corpus}', {corpus: props.corpname})}:{'\u00a0'}
                        <CurrentCorpCheckbox value={props.currentCorpusOnly} />
                    </label>
                    <label>
                        {he.translate('qhistory__query_supertype_sel')}:{'\u00a0'}
                        <SearchKindSelector value={props.querySupertype} />
                    </label>
                    <label>
                        {he.translate('qhistory__checkbox_archived_only')}:{'\u00a0'}
                        <ArchivedOnlyCheckbox value={props.archivedOnly} />
                    </label>
                </fieldset>
            </S.FilterForm>
        );
    };

    // -------------------- <AlignedQueryInfo /> ------------------------

    const AlignedQueryInfo:React.FC<{
        query_type:QueryType;
        query:string;

    }> = (props) => {
        return (
            <S.AlignedQueryInfoDiv>
                <S.QueryAndTypeDiv>
                    <span className="symbol">{'\u2016\u00a0'}</span>
                    <span className="query" title={typeToHuman(props.query_type)}>
                        {props.query ?
                            props.query :
                            <span className="blank">-- {he.translate('qhistory__blank_query')} --</span>
                        }
                    </span>
                </S.QueryAndTypeDiv>
            </S.AlignedQueryInfoDiv>
        );
    };

    // -------------------- <TextTypesInfo /> ------------------------

    class TextTypesInfo extends React.Component<{
        textTypes:Kontext.GeneralProps;
    },
    {
        expanded:boolean;
    }> {

        constructor(props) {
            super(props);
            this.state = {
                expanded: false
            };
            this._handleExpandClick = this._handleExpandClick.bind(this);
        }

        _handleExpandClick() {
            this.setState({expanded: !this.state.expanded});
        }

        render() {
            if (!Dict.empty(this.props.textTypes)) {
                return (
                    <div className="text-types-info">
                        <a className="switch" onClick={this._handleExpandClick}
                                title={he.translate(this.state.expanded ? 'global__click_to_hide' : 'global__click_to_expand')}>
                            {he.translate('qhistory__attached_text_types')}
                            {!this.state.expanded ? '\u00a0\u2026' : null}
                        </a>
                        {this.state.expanded ? ':' : null}
                        {this.state.expanded ?
                            (<ul>
                                {pipe(
                                    this.props.textTypes,
                                    Dict.keys(),
                                    List.map(k => (
                                        <li key={k}>
                                            <strong>{k}</strong>:
                                            {this.props.textTypes[k].join(', ')}
                                        </li>
                                    ))
                                )}
                            </ul>) : null
                        }
                    </div>
                );

            } else {
                return null;
            }
        }
    };

    // -------------------- <QueryInfo /> ------------------------

    const QueryInfo:React.FC<{
        itemIdx:number;
        isEdited:boolean;
        query_type:QueryType;
        query_sh:string;
        query:string;
        textTypes:Kontext.GeneralProps;
        aligned:QueryHistoryItem['aligned'];

    }> = (props) => {

        const handleAreaClick = () => {
            dispatcher.dispatch<Actions.HistoryOpenQueryForm>({
                name: ActionName.HistoryOpenQueryForm,
                payload: {
                    idx: props.itemIdx
                }
            });
        };

        return (
            <S.QueryInfoDiv>
                <S.QueryAndTypeDiv onClick={handleAreaClick} title={he.translate('qhistory__open_in_form')}>
                    {
                        props.query_sh ?
                        <pre className="query" dangerouslySetInnerHTML={{__html: props.query_sh}} /> :
                        <span className="query">{props.query}</span>
                    }
                </S.QueryAndTypeDiv>
                {List.map(
                    v => <AlignedQueryInfo key={v.corpname}
                            query={v.query} query_type={v.query_type} />,
                    props.aligned
                )}
                <TextTypesInfo textTypes={props.textTypes} />
            </S.QueryInfoDiv>
        );
    }

    // -------------------- <SavedNameInfo /> ------------------------

    const SavedNameInfo:React.FC<{
        itemIdx:number;
        hasEditor:boolean;
        editingQueryName:string;

    }> = (props) => {

        const handleEditClick = (evt) => {
            dispatcher.dispatch<Actions.HistorySetEditedItem>({
                name: ActionName.HistorySetEditedItem,
                payload: {
                    itemIdx: props.itemIdx
                }
            });
        };

        const handleDoNotSaveClick = () => {
            dispatcher.dispatch<Actions.HistoryDoNotArchive>({
                name: ActionName.HistoryDoNotArchive,
                payload: {
                    itemIdx: props.itemIdx
                }
            });
        };

        return (
            <S.SavedNameInfoSpan>
                {props.editingQueryName && !props.hasEditor ?
                    <button className="util-button" onClick={handleDoNotSaveClick}>
                        {he.translate('query__save_as_transient')}
                    </button> :
                    props.hasEditor ?
                        <SaveItemForm name={props.editingQueryName} itemIdx={props.itemIdx} /> :
                        <button className="util-button" onClick={handleEditClick}>
                            {he.translate('query__save_button')}{'\u2026'}
                        </button>
                }

            </S.SavedNameInfoSpan>
        );
    }

    // -------------------- <SaveItemForm /> ------------------------

    const SaveItemForm:React.FC<{
        itemIdx:number;
        name:string;

    }> = (props) => {

        const handleInputChange = (evt) => {
            dispatcher.dispatch<Actions.HistoryEditorSetName>({
                name: ActionName.HistoryEditorSetName,
                payload: {
                    itemIdx: props.itemIdx,
                    value: evt.target.value
                }
            });
        };

        const handleSubmitClick = () => {
            dispatcher.dispatch<Actions.HistoryEditorClickSave>({
                name: ActionName.HistoryEditorClickSave,
                payload: {
                    itemIdx: props.itemIdx
                }
            });
        };

        const handleCloseClick = () => {
            dispatcher.dispatch<Actions.HistoryCloseEditedItem>({
                name: ActionName.HistoryCloseEditedItem,
                payload: {
                    itemIdx: props.itemIdx
                }
            });
        };

        const handleKeyDown = (evt) => {
            if (evt.key === Keyboard.Value.ESC) {
                evt.preventDefault();
                evt.stopPropagation();
                handleCloseClick();

            } else if (evt.key === Keyboard.Value.ENTER) {
                evt.preventDefault();
                evt.stopPropagation();
                handleSubmitClick();
            }
        };

        return (
            <S.SaveItemForm onKeyDown={handleKeyDown}>
                <a onClick={handleCloseClick}>
                    <img src={he.createStaticUrl('img/close-icon.svg')} alt={he.translate('global__close')}
                                style={{width: '1em', verticalAlign: 'middle'}} />
                </a>
                {'\u00a0'}{he.translate('query__save_as_keep_archived')}:{'\u00a0'}
                <input type="text" style={{width: '15em'}}
                        value={props.name}
                        onChange={handleInputChange}
                        ref={item => item ? item.focus() : null} />
                {'\u00a0'}
                <button type="button" className="default-button"
                        onClick={handleSubmitClick}>
                    {he.translate('global__ok')}
                </button>
                <br />
            </S.SaveItemForm>
        );
    };

    // ----------- <RemoveFromHistoryButton /> ------------------

    const RemoveFromHistoryButton:React.FC<{
        itemIdx:number;

    }> = (props) => {

        const handleClick = () => {
            dispatcher.dispatch<Actions.RemoveItemFromList>({
                name: ActionName.RemoveItemFromList,
                payload: {
                    itemIdx: props.itemIdx
                }
            });
        };

        return (
            <S.RemoveFromHistoryButton type="button" className="util-button" onClick={handleClick}>
                {he.translate('qhistory__remove_from_list')}
            </S.RemoveFromHistoryButton>
        );
    };

    // ------------------ <RowToolbar /> -----------------------------------

    const RowToolbar:React.FC<{
        itemIdx:number;
        queryId:string;
        name:string;
        nameEditorVisible:boolean;

    }> = (props) => {
        return <>
            <RemoveFromHistoryButton itemIdx={props.itemIdx} />
            <span>
                {props.queryId ?
                <SavedNameInfo
                        itemIdx={props.itemIdx}
                        hasEditor={props.nameEditorVisible}
                        editingQueryName={props.name} /> :
                        null /* legacy query history record cannot be archived  */
                }
            </span>
        </>
    }

    // -------------------- <DataRowActions /> ------------------------

    const DataRowActions:React.FC<{
        data:QueryHistoryItem;
        toolbarVisible:boolean;
        nameEditorVisible:boolean;

    }> = (props) => {

        const handleRowToolbarClick = () => {
            dispatcher.dispatch<Actions.ToggleRowToolbar>({
                name: ActionName.ToggleRowToolbar,
                payload: {
                    rowIdx: props.data.idx
                }
            });
        };

        return (
            <S.ActionsDiv>
                {props.data.name && !props.nameEditorVisible ?
                    <span className="saved-as">
                        {he.translate('query__save_as_saved_as')}:{'\u00a0'}
                        <span className="saved-name">{props.data.name}</span>
                    </span> :
                    null
                }
                <span className="tools">
                    {props.toolbarVisible ?
                        <RowToolbar
                            itemIdx={props.data.idx}
                            queryId={props.data.query_id}
                            name={props.data.name}
                            nameEditorVisible={props.nameEditorVisible} /> :
                        null
                    }
                    <a onClick={handleRowToolbarClick}>
                        <layoutViews.ImgWithMouseover src={gearIcon} src2={gearIconS} alt="edit" />
                    </a>
                </span>
            </S.ActionsDiv>
        )
    }

    // -------------------- <DataRow /> ------------------------

    const DataRow:React.FC<{
        toolbarVisible:boolean;
        nameEditorVisible:boolean;
        data:QueryHistoryItem;

    }> = (props) => {

        return (
            <S.DataRowLi>
                <div className="heading">
                    <strong>
                        {props.data.idx + 1}.
                    </strong>
                    {'\u00a0'}
                    <h3>
                        <span className="supertype">{supertypeToHuman(props.data.q_supertype)}</span>,{'\u00a0'}
                        {props.data.human_corpname}
                        {props.data.subcorpname ?
                            <span className="subcorpname" title={he.translate('global__subcorpus')}>:
                                    {props.data.subcorpname}</span> :
                            null
                        }
                        {List.map(
                            v => <span key={v.corpname} className="corpname"> || {v.human_corpname}</span>,
                            props.data.aligned
                        )}
                    </h3>
                    <span className="date">
                        {he.formatDate(new Date(props.data.created * 1000), 1)}
                    </span>
                </div>
                <QueryInfo
                        itemIdx={props.data.idx}
                        isEdited={props.toolbarVisible}
                        query={props.data.query}
                        query_sh={props.data.query_sh}
                        query_type={props.data.query_type}
                        aligned={props.data.aligned}
                        textTypes={props.data.selected_text_types} />
                <DataRowActions toolbarVisible={props.toolbarVisible}
                        nameEditorVisible={props.nameEditorVisible}
                        data={props.data} />
            </S.DataRowLi>
        );
    };

    // -------------------- <LoadMoreBlock /> ------------------------

    const LoadMoreBlock:React.FC<{
        modelIsBusy:boolean;

    }> = (props) => {

        const handleClick = () => {
            dispatcher.dispatch<Actions.HistoryLoadMore>({
                name: ActionName.HistoryLoadMore
            });
        };

        return (
            <div className="last-row">
                <a onClick={handleClick}>
                    {props.modelIsBusy ?
                    (<img src={he.createStaticUrl('img/ajax-loader.gif')}
                            alt={he.translate('global__loading')} />) :
                    <span>{he.translate('qhistory__load_more_link')}</span>
                    }
                </a>
            </div>
        );
    };

    // -------------------- <NoDataBlock /> ------------------------

    const NoDataBlock:React.FC<{}> = (props) => {
        return (
            <div className="last-row">
                {he.translate('global__no_data_found')}
            </div>
        );
    };

    // -------------------- <DataTableFooter /> ------------------------

    const DataTableFooter:React.FC<{
        dataLength:number;
        hasMoreItems:boolean;
        modelIsBusy:boolean;

    }> = (props) => {
        if (props.dataLength > 0) {
            if (props.hasMoreItems) {
                return <LoadMoreBlock modelIsBusy={props.modelIsBusy} />

            } else {
                return null;
            }

        } else {
            return <NoDataBlock />;
        }
    };

    // -------------------- <DataTable /> ------------------------

    const DataTable:React.FC<{
        offset:number;
        hasMoreItems:boolean;
        modelIsBusy:boolean;
        itemsToolbars:Array<[boolean, boolean]>;
        data:Array<QueryHistoryItem>;

    }> = (props) => {
        return (
            <div>
                <ul className="history-entries">
                    {pipe(
                        props.data,
                        List.map(
                            item => {
                                const [ toolbarVisible, nameEdited ] = props.itemsToolbars[item.idx];
                                return (
                                    <DataRow key={item.idx + props.offset} data={item}
                                        toolbarVisible={toolbarVisible}
                                        nameEditorVisible={nameEdited} />
                                );
                            }
                        )
                    )}
                </ul>
                <DataTableFooter dataLength={props.data.length} modelIsBusy={props.modelIsBusy}
                        hasMoreItems={props.hasMoreItems} />
            </div>
        );
    };

    // -------------------- <RecentQueriesPageList /> ------------------------

    const RecentQueriesPageList:React.FC<SearchHistoryModelState> = (props) => {
        return (
            <S.RecentQueriesPageList>
                <FilterForm
                        corpname={props.corpname}
                        querySupertype={props.querySupertype}
                        currentCorpusOnly={props.currentCorpusOnly}
                        archivedOnly={props.archivedOnly} />
                {props.data.length === 0 && props.isBusy ?
                    <div className="loader"><layoutViews.AjaxLoaderImage /></div> :
                    <DataTable data={props.data} offset={props.offset}
                            modelIsBusy={props.isBusy}
                            hasMoreItems={props.hasMoreItems}
                            itemsToolbars={props.itemsToolbars} />
                }
            </S.RecentQueriesPageList>
        );
    }


    return {
        RecentQueriesPageList: Bound(RecentQueriesPageList, queryHistoryModel)
    };

}