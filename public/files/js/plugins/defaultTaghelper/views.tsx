/*
 * Copyright (c) 2016 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2016 Tomas Machalek <tomas.machalek@gmail.com>
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
import { IActionDispatcher, StatelessModel, BoundWithProps } from 'kombo';
import { Kontext } from '../../types/common';
import { PluginInterfaces } from '../../types/plugins';
import { TagBuilderBaseState } from './common';
import { Actions, ActionName, QueryFormType } from '../../models/query/actions';
import { Dict, List, pipe } from 'cnc-tskit';

export function init(
    dispatcher:IActionDispatcher,
    he:Kontext.ComponentHelpers,
    models:{[key:string]:StatelessModel<TagBuilderBaseState>},
    widgetViews:{[key:string]:any}) { // TODO Type

    const layoutViews = he.getLayoutViews();

    // ------------------------------ <InsertButton /> ----------------------------

    const InsertButton:React.SFC<{onClick:(evt:React.MouseEvent<{}>)=>void}> = (props) => {
        return (
            <button className="util-button" type="button"
                    value="insert" onClick={props.onClick}>
                {he.translate('taghelper__insert_btn')}
            </button>
        );
    }

    // ------------------------------ <UndoButton /> ----------------------------

    const UndoButton:React.SFC<{onClick:(evt:React.MouseEvent<{}>)=>void; enabled:boolean}> = (props) => {
        if (props.enabled) {
            return (
                <button type="button" className="util-button" value="undo"
                        onClick={props.onClick}>
                    {he.translate('taghelper__undo')}
                </button>
            );

        } else {
            return (
                <span className="util-button disabled">
                    {he.translate('taghelper__undo')}
                </span>
            );
        }
    };

    // ------------------------------ <ResetButton /> ----------------------------

    const ResetButton:React.SFC<{onClick:(evt:React.MouseEvent<{}>)=>void; enabled:boolean}> = (props) => {
        if (props.enabled) {
            return (
                <button type="button" className="util-button cancel"
                        value="reset" onClick={props.onClick}>
                    {he.translate('taghelper__reset')}
                </button>
            );

        } else {
            return (
                <span className="util-button disabled">
                    {he.translate('taghelper__reset')}
                </span>
            );
        }
    };


    // ------------------------------ <TagButtons /> ----------------------------

    const TagButtons:React.SFC<{
                range:[number, number];
                formType:QueryFormType;
                sourceId:string;
                onInsert?:()=>void;
                canUndo:boolean;
                rawPattern:string;
                generatedQuery:string;
            }> = (props) => {

        const buttonClick = (evt) => {
            if (evt.target.value === 'reset') {
                dispatcher.dispatch({
                    name: 'TAGHELPER_RESET',
                    payload: {
                        sourceId: props.sourceId
                    }
                });

            } else if (evt.target.value === 'undo') {
                dispatcher.dispatch({
                    name: 'TAGHELPER_UNDO',
                    payload: {
                        sourceId: props.sourceId
                    }
                });

            } else if (evt.target.value === 'insert') {
                if (Array.isArray(props.range) && props.range[0] && props.range[1]) {
                    const query = `"${props.rawPattern}"`;
                    dispatcher.dispatch<Actions.QueryInputSetQuery>({
                        name: ActionName.QueryInputSetQuery,
                        payload: {
                            formType: props.formType,
                            sourceId: props.sourceId,
                            query: query,
                            insertRange: [props.range[0], props.range[1]],
                            rawAnchorIdx: null,
                            rawFocusIdx: null
                        }
                    });

                } else {
                    dispatcher.dispatch<Actions.QueryInputSetQuery>({
                        name: ActionName.QueryInputSetQuery,
                        payload: {
                            formType: props.formType,
                            sourceId: props.sourceId,
                            query: `[${props.generatedQuery}]`,
                            insertRange: [props.range[0], props.range[1]],
                            rawAnchorIdx: null,
                            rawFocusIdx: null
                        }
                    });
                }
                dispatcher.dispatch({
                    name: 'TAGHELPER_RESET',
                    payload: {
                        sourceId: props.sourceId
                    }
                });
                if (typeof props.onInsert === 'function') {
                    props.onInsert();
                }
            }
        };

        return (
            <div className="buttons">
                <InsertButton onClick={buttonClick} />
                <UndoButton onClick={buttonClick} enabled={props.canUndo} />
                <ResetButton onClick={buttonClick} enabled={props.canUndo} />
            </div>
        );
    };

    // ------------------------------ <TagBuilder /> ----------------------------

    type ActiveTagBuilderProps = PluginInterfaces.TagHelper.ViewProps & {activeView:React.ComponentClass|React.SFC};

    class TagBuilder extends React.Component<ActiveTagBuilderProps & TagBuilderBaseState> {

        constructor(props) {
            super(props);
        }

        componentDidMount() {
            dispatcher.dispatch({
                name: 'TAGHELPER_GET_INITIAL_DATA',
                payload: {
                    sourceId: this.props.sourceId
                }
            });
        }

        render() {
            return (
                <div>
                    <this.props.activeView {...this.props} />
                    <div className="flex">
                        <TagButtons sourceId={this.props.sourceId}
                                    onInsert={this.props.onInsert}
                                    canUndo={this.props.canUndo}
                                    range={this.props.range}
                                    formType={this.props.formType}
                                    rawPattern={this.props.rawPattern}
                                    generatedQuery={this.props.generatedQuery} />
                        <div>
                            { this.props.isBusy ? <layoutViews.AjaxLoaderBarImage /> : null }
                        </div>
                    </div>
                </div>
            );
        }
    }

    const AvailableTagBuilderBound = Dict.map(model => BoundWithProps<ActiveTagBuilderProps, TagBuilderBaseState>(TagBuilder, model), models);

    // ---------------- <ActiveTagBuilder /> -----------------------------------

    const ActiveTagBuilder:React.SFC<PluginInterfaces.TagHelper.ViewProps> = (props) => {
        const handleTabSelection = (value:string) => {
            dispatcher.dispatch({
                name: 'TAGHELPER_SET_ACTIVE_TAG',
                payload: {value: value}
            });
        };

        const tagsetTabs = pipe(
            widgetViews,
            Dict.keys(),
            List.map(
                tagset => ({
                    id: tagset,
                    label: tagset
                })
            )
        );

        const children = pipe(
            widgetViews,
            Dict.toEntries(),
            List.map(tagset => {
                const TagBuilderBound = AvailableTagBuilderBound[tagset[0]];
                return <TagBuilderBound
                            key={tagset[0]}
                            activeView={tagset[1]}
                            sourceId={props.sourceId}
                            formType={props.formType}
                            range={props.range}
                            onInsert={props.onInsert}
                            onEscKey={props.onEscKey} />;
            })
        );

        return (
            <div>
                <h3>{he.translate('taghelper__create_tag_heading')}</h3>
                <layoutViews.TabView
                    className="TagsetFormSelector"
                    callback={handleTabSelection}
                    items={tagsetTabs} >

                    {children}
                </layoutViews.TabView>
            </div>
        );
    }

    return ActiveTagBuilder;
}
