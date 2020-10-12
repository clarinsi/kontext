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
import { IActionDispatcher, BoundWithProps, Bound } from 'kombo';
import { Keyboard, List, pipe } from 'cnc-tskit';

import { init as keyboardInit } from './virtualKeyboard';
import { init as cqlEditoInit } from './cqlEditor';
import { WithinBuilderModel, WithinBuilderModelState } from '../../models/query/withinBuilder';
import { PluginInterfaces } from '../../types/plugins';
import { Kontext } from '../../types/common';
import { QueryFormModel, QueryFormModelState, QueryType, SuggestionsData } from '../../models/query/common';
import { UsageTipsModel, UsageTipsState, UsageTipCategory } from '../../models/usageTips';
import { VirtualKeyboardModel } from '../../models/query/virtualKeyboard';
import { CQLEditorModel } from '../../models/query/cqleditor/model';
import { Actions, ActionName, QueryFormType } from '../../models/query/actions';
import { Actions as HintActions,
    ActionName as HintActionName } from '../../models/usageTips/actions';
import { first } from 'rxjs/operators';


export interface InputModuleArgs {
    dispatcher:IActionDispatcher;
    he:Kontext.ComponentHelpers;
    queryModel:QueryFormModel<QueryFormModelState>;
    queryHintModel:UsageTipsModel;
    withinBuilderModel:WithinBuilderModel;
    virtualKeyboardModel:VirtualKeyboardModel;
    cqlEditorModel:CQLEditorModel;
    querySuggest:PluginInterfaces.QuerySuggest.IPlugin;
}


export interface InputModuleViews {
    TRQueryInputField:React.ComponentClass<TRQueryInputFieldProps>;
    TRPcqPosNegField:React.FC<TRPcqPosNegFieldProps>;
    TRIncludeEmptySelector:React.FC<TRIncludeEmptySelectorProps>;
    AdvancedFormFieldset:React.FC<AdvancedFormFieldsetProps>;
}


export interface TRQueryInputFieldProps {
    sourceId:string;
    lposValue:string;
    wPoSList:Array<{n:string; v:string}>;
    queryType:QueryType;
    queryStorageView:PluginInterfaces.QueryStorage.WidgetView;
    tagHelperView:PluginInterfaces.TagHelper.View;
    widgets:Array<string>;
    inputLanguage:string;
    useCQLEditor:boolean;
    forcedAttr:string;
    attrList:Array<Kontext.AttrItem>;
    onEnterKey:()=>void;
    takeFocus?:boolean;
    qsuggPlugin:PluginInterfaces.QuerySuggest.IPlugin;
    customOptions?:Array<React.ReactElement<{span:number}>>;
}


export interface TRQueryTypeFieldProps {
    formType:QueryFormType;
    sourceId:string;
    queryType:QueryType;
}


export interface TRPcqPosNegFieldProps {
    span:number;
    formType:QueryFormType;
    sourceId:string;
    value:string; // TODO enum
}

export interface TRIncludeEmptySelectorProps {
    span:number;
    value:boolean;
    corpname:string;
}

export interface AdvancedFormFieldsetProps {
    formVisible:boolean;
    title:string;
    closedStateHint?:React.ReactElement;
    htmlClass?:string;
    handleClick:()=>void;
}

interface SingleLineInputProps {
    sourceId:string;
    refObject:React.RefObject<HTMLInputElement>;
    hasHistoryWidget:boolean;
    historyIsVisible:boolean;
    onReqHistory:()=>void;
    onEsc:()=>void;
}

interface QueryToolboxProps {
    sourceId:string;
    widgets:Array<string>;
    inputLanguage:string;
    tagHelperView:PluginInterfaces.TagHelper.View;
    qsAvailable:boolean;
    toggleHistoryWidget:()=>void;
}


export function init({
    dispatcher, he, queryModel, queryHintModel, withinBuilderModel,
    virtualKeyboardModel, cqlEditorModel, querySuggest}:InputModuleArgs):InputModuleViews {

    const keyboardViews = keyboardInit({
        dispatcher: dispatcher,
        he: he,
        queryModel: queryModel,
        virtualKeyboardModel: virtualKeyboardModel
    });
    const cqlEditorViews = cqlEditoInit(dispatcher, he, queryModel, cqlEditorModel);
    const layoutViews = he.getLayoutViews();


    // ------------------- <AdvancedFormFieldset /> -----------------------------

    const AdvancedFormFieldset:React.FC<AdvancedFormFieldsetProps> = (props) => {

        const htmlClasses = ['form-extension-switch'];
        htmlClasses.push(props.formVisible ? 'collapse' : 'expand');

        const firstChild = () => Array.isArray(props.children) ? props.children[0] : props.children;

        const secondChild = () => Array.isArray(props.children) ? props.children[1] : null;

        return (
            <fieldset className={`${props.htmlClass}${props.formVisible && props.htmlClass ? '' : ' closed'}`}>
                <legend>
                    <a className={htmlClasses.join(' ')}
                            onClick={props.handleClick}>
                        {props.title}{props.formVisible ? null : '\u2026'}
                    </a>
                    {props.formVisible ? null : props.closedStateHint}
                </legend>
                {props.formVisible ? firstChild() : secondChild()}
            </fieldset>
        );
    };

    // -------------- <QueryHints /> --------------------------------------------

    class QueryHints extends React.PureComponent<UsageTipsState> {

        constructor(props) {
            super(props);
            this._clickHandler = this._clickHandler.bind(this);
        }

        _clickHandler() {
            dispatcher.dispatch<HintActions.NextQueryHint>({
                name: HintActionName.NextQueryHint
            });
        }

        render() {
            return (
                <div className="QueryHints">
                    <span className="hint">{this.props.currentHints[UsageTipCategory.QUERY]}</span>
                    <span className="next-hint">
                        <a onClick={this._clickHandler} title={he.translate('global__next_tip')}>
                            <layoutViews.ImgWithMouseover src={he.createStaticUrl('img/next-page.svg')}
                                    alt={he.translate('global__next_tip')} />
                        </a>
                    </span>
                </div>
            );
        }
    }

    const BoundQueryHints = Bound<UsageTipsState>(QueryHints, queryHintModel);


    // ------------------- <TRQueryTypeField /> -----------------------------

    const TRQueryTypeField:React.FC<TRQueryTypeFieldProps> = (props) => {

        const handleSelection = (evt) => {
            dispatcher.dispatch<Actions.QueryInputSetQType>({
                name: ActionName.QueryInputSetQType,
                payload: {
                    formType: props.formType,
                    sourceId: props.sourceId,
                    queryType: props.queryType === 'advanced' ? 'simple' : 'advanced'
                }
            });
        };

        return (
            <div className="TRQueryTypeField">
                <label htmlFor="chck_wsdA3fe">{he.translate('query__qt_advanced')}:</label>
                <input id="chck_wsdA3fe" type="checkbox"
                    onChange={handleSelection}
                    checked={props.queryType === 'advanced'} />
            </div>
        );
    };

    // ------------------- <TRPcqPosNegField /> -----------------------------

    const TRPcqPosNegField:React.FC<TRPcqPosNegFieldProps> = (props) => {

        const handleSelectChange = (evt) => {
            dispatcher.dispatch<Actions.FilterInputSetPCQPosNeg>({
                name: ActionName.FilterInputSetPCQPosNeg,
                payload: {
                    filterId: props.sourceId,
                    formType: props.formType,
                    value: evt.target.value
                }
            });
        };

        return (
            <div>
                <label>{he.translate('query__align_posneg_label')}</label>:{'\u00a0'}
                <select value={props.value} onChange={handleSelectChange}>
                    <option value="pos">{he.translate('query__align_contains')}</option>
                    <option value="neg">{he.translate('query__align_not_contains')}</option>
                </select>
            </div>
        );
    };

    // ---------------- <TRIncludeEmptySelector /> ---------------------------

    const TRIncludeEmptySelector:React.FC<TRIncludeEmptySelectorProps> = (props) => {

        const handleCheckbox = () => {
            dispatcher.dispatch<Actions.QueryInputSetIncludeEmpty>({
                name: ActionName.QueryInputSetIncludeEmpty,
                payload: {
                    corpname: props.corpname,
                    value: !props.value
                }
            });
        };

        return (
            <div className="TRIncludeEmptySelector">
                <label>
                    {he.translate('query__include_empty_aligned')}:{'\u00a0'}
                    <input type="checkbox" checked={props.value}
                        onChange={handleCheckbox} />
                </label>
            </div>
        );
    };

    // ------------------- <TagWidget /> --------------------------------

    const TagWidget:React.FC<{
        formType:QueryFormType;
        sourceId:string;
        args:Kontext.GeneralProps;
        tagHelperView:PluginInterfaces.TagHelper.View
        closeClickHandler:()=>void;

    }> = (props) => {

        return (
            <layoutViews.PopupBox
                    onCloseClick={props.closeClickHandler}
                    customClass="tag-builder-widget"
                    customStyle={{position: 'absolute', left: '10em', marginTop: '6.5em'}}
                    takeFocus={true}>
                <props.tagHelperView
                        sourceId={props.sourceId}
                        onInsert={props.closeClickHandler}
                        onEscKey={props.closeClickHandler}
                        formType={props.formType}
                        range={[props.args['leftIdx'], props.args['rightIdx']]} />
            </layoutViews.PopupBox>
        );
    };

    // ------------------- <WithinWidget /> --------------------------------

    interface WithinWidgetProps {
        formType:QueryFormType;
        sourceId:string;
        closeClickHandler:()=>void;
    }

    class WithinWidget extends React.PureComponent<WithinWidgetProps & WithinBuilderModelState> {

        constructor(props) {
            super(props);
            this._handleInputChange = this._handleInputChange.bind(this);
            this._handleKeyDown = this._handleKeyDown.bind(this);
            this._handleAttrChange = this._handleAttrChange.bind(this);
            this._handleInsert = this._handleInsert.bind(this);
        }

        _handleInputChange(evt) {
            dispatcher.dispatch<Actions.SetWithinValue>({
                name: ActionName.SetWithinValue,
                payload: {
                    value: evt.target.value
                }
            });
        }

        _handleKeyDown(evt) {
            if (evt.keyCode === Keyboard.Code.ESC) {
                evt.stopPropagation();
                evt.preventDefault();
                this.props.closeClickHandler();
            }
        }

        _handleAttrChange(evt) {
            dispatcher.dispatch<Actions.SetWithinAttr>({
                name: ActionName.SetWithinAttr,
                payload: {
                    idx: evt.target.value
                }
            });
        }

        _handleInsert() {
            dispatcher.dispatch<Actions.QueryInputAppendQuery>({
                name: ActionName.QueryInputAppendQuery,
                payload: {
                    formType: this.props.formType,
                    sourceId: this.props.sourceId,
                    query: WithinBuilderModel.exportQuery(this.props),
                    prependSpace: true,
                    closeWhenDone: true
                }
            });
        }

        componentDidMount() {
            dispatcher.dispatch<Actions.LoadWithinBuilderData>({
                name: ActionName.LoadWithinBuilderData,
                payload: {
                    sourceId: this.props.sourceId
                }
            });
        }

        render() {
            return (
                <layoutViews.PopupBox
                        onCloseClick={this.props.closeClickHandler}
                        customStyle={{position: 'absolute', left: '80pt', marginTop: '5pt'}}>
                    <div onKeyDown={this._handleKeyDown}>
                        <h3>{he.translate('query__create_within')}</h3>
                        {this.props.isBusy ?
                            <layoutViews.AjaxLoaderImage /> :
                            <>
                                <div className="within-widget">
                                    <select onChange={this._handleAttrChange} value={this.props.currAttrIdx}>
                                        {List.map(
                                            ([struct, attr], i) => (
                                                <option key={`${struct}-${attr}`} value={i}>{WithinBuilderModel.ithValue(this.props, i)}</option>
                                            ),
                                            this.props.data
                                        )}
                                    </select>
                                    {'\u00a0'}={'\u00a0'}
                                    <input type="text" value={this.props.query} onChange={this._handleInputChange}
                                            ref={item => item ? item.focus() : null} />
                                    {'\u00a0'}
                                </div>
                                <p>
                                    <button type="button" className="util-button"
                                            onClick={this._handleInsert}>
                                        {he.translate('query__insert_within')}
                                    </button>
                                </p>
                            </>
                        }
                    </div>
                </layoutViews.PopupBox>
            );
        }
    }

    const BoundWithinWidget = BoundWithProps<WithinWidgetProps, WithinBuilderModelState>(WithinWidget, withinBuilderModel);

    // ------------------- <HistoryWidget /> -----------------------------

    const HistoryWidget:React.FC<{
        sourceId:string;
        formType:QueryFormType;
        onCloseTrigger:()=>void;
        queryStorageView:PluginInterfaces.QueryStorage.WidgetView;

    }> = (props) => {
        return (
            <div className="history-widget">
                <props.queryStorageView
                        sourceId={props.sourceId}
                        onCloseTrigger={props.onCloseTrigger}
                        formType={props.formType} />
            </div>
        );
    };

    // ------------------- <SuggestionsWidget /> -----------------------------

    const SuggestionsWidget:React.FC<{
        qsuggPlugin:PluginInterfaces.QuerySuggest.IPlugin;
        suggestionData:SuggestionsData;
        formType:QueryFormType;
        sourceId:string;
        handleItemClick:(onItemClick:string, value:string, attr:string) => void;

    }> = (props) => {

        const suggestions = props.suggestionData[props.sourceId].data;
        const dynCls = List.every(s => querySuggest.isEmptyResponse(s), suggestions) ?
            ' empty' : '';

        const handleKey = () => {
            dispatcher.dispatch<Actions.ToggleQuerySuggestionWidget>({
                name: ActionName.ToggleQuerySuggestionWidget,
                payload: {
                    formType: props.formType,
                    sourceId: props.sourceId
                }
            });
        };

        return (
            <div className={`SuggestionsWidget${dynCls}`} tabIndex={-1} onKeyDown={handleKey}>
            {QueryFormModel.hasSuggestionsFor(props.suggestionData, props.sourceId, querySuggest) ?
                pipe(
                    suggestions,
                    List.filter(v => !props.qsuggPlugin.isEmptyResponse(v)),
                    List.map(
                        (v, i) => (
                            <React.Fragment key={`${v.rendererId}${i}`}>
                                <h2>{v.heading}:</h2>
                                {props.qsuggPlugin.createElement(v, props.handleItemClick)}
                                {props.suggestionData[props.sourceId].isPartial ?
                                    <layoutViews.AjaxLoaderBarImage /> : null}
                            </React.Fragment>
                        ),
                    )
                ) : null
            }
            </div>
        );
    };

    // ------------------- <KeyboardWidget /> --------------------------------

    const KeyboardWidget:React.FC<{
        sourceId:string;
        formType:QueryFormType;
        inputLanguage:string;
        closeClickHandler:()=>void;

    }> = (props) => {

        const keyHandler = (evt) => {
            dispatcher.dispatch<Actions.QueryInputHitVirtualKeyboardKey>({
                name: ActionName.QueryInputHitVirtualKeyboardKey,
                payload: {
                    keyCode: evt.keyCode
                }
            });
        };

        return (
            <layoutViews.PopupBox
                    onCloseClick={props.closeClickHandler}
                    customStyle={{marginTop: '3.5em'}}
                    takeFocus={true}
                    keyPressHandler={keyHandler}>
                <keyboardViews.VirtualKeyboard sourceId={props.sourceId}
                        inputLanguage={props.inputLanguage}
                        formType={props.formType} />
            </layoutViews.PopupBox>
        );
    };

    // ------------------- <QueryToolbox /> -----------------------------

    class QueryToolbox extends React.PureComponent<QueryToolboxProps & QueryFormModelState> {

        constructor(props) {
            super(props);
            this._handleWidgetTrigger = this._handleWidgetTrigger.bind(this);
            this._handleHistoryWidget = this._handleHistoryWidget.bind(this);
            this._handleCloseWidget = this._handleCloseWidget.bind(this);
            this._handleQuerySuggestWidget = this._handleQuerySuggestWidget.bind(this);
        }

        _renderButtons() {
            const ans = [];
            if (this.props.widgets.indexOf('tag') > -1) {
                ans.push(<a onClick={this._handleWidgetTrigger.bind(this, 'tag')}>{he.translate('query__insert_tag_btn_link')}</a>);
            }
            if (this.props.widgets.indexOf('within') > -1) {
                ans.push(<a onClick={this._handleWidgetTrigger.bind(this, 'within')}>{he.translate('query__insert_within_link')}</a>);
            }
            if (this.props.widgets.indexOf('keyboard') > -1) {
                ans.push(<a onClick={this._handleWidgetTrigger.bind(this, 'keyboard')}>{he.translate('query__keyboard_link')}</a>);
            }
            if (this.props.widgets.indexOf('history') > -1) {
                ans.push(<a onClick={this._handleHistoryWidget}>{he.translate('query__recent_queries_link')}</a>);
            }
            if (this.props.qsAvailable) {
                ans.push(
                    <>
                        <a onClick={this._handleQuerySuggestWidget}>{he.translate('query__suggestions_available')}</a>
                        {this.props.suggestionsVisible[this.props.sourceId] ?
                            null :
                            <span className="notifications">{'\u25CF'}</span>
                        }
                    </>
                );
            }
            return ans;
        }

        _handleWidgetTrigger(name) {
            dispatcher.dispatch<Actions.SetActiveInputWidget>({
                name: ActionName.SetActiveInputWidget,
                payload: {
                    formType: this.props.formType,
                    sourceId: this.props.sourceId,
                    value: name,
                    widgetArgs: this.props.widgetArgs
                }
            });
        }

        _handleHistoryWidget() {
            this.setState({
                activeWidget: null,
                widgetArgs: {}
            });
            this.props.toggleHistoryWidget();
        }

        _handleCloseWidget() {
            dispatcher.dispatch<Actions.SetActiveInputWidget>({
                name: ActionName.SetActiveInputWidget,
                payload: {
                    formType: this.props.formType,
                    sourceId: this.props.sourceId,
                    value: null,
                    widgetArgs: this.props.widgetArgs
                }
            });
        }

        _handleQuerySuggestWidget() {
            dispatcher.dispatch<Actions.ToggleQuerySuggestionWidget>({
                name: ActionName.ToggleQuerySuggestionWidget,
                payload: {
                    sourceId: this.props.sourceId,
                    formType: this.props.formType
                }
            });
        }

        _renderWidget() {
            switch (this.props.activeWidgets[this.props.sourceId]) {
                case 'tag':
                    return <TagWidget closeClickHandler={this._handleCloseWidget}
                                tagHelperView={this.props.tagHelperView}
                                sourceId={this.props.sourceId}
                                formType={this.props.formType}
                                args={this.props.widgetArgs} />;
                case 'within':
                    return <BoundWithinWidget closeClickHandler={this._handleCloseWidget}
                                sourceId={this.props.sourceId} formType={this.props.formType} />;
                case 'keyboard':
                    return <KeyboardWidget closeClickHandler={this._handleCloseWidget}
                                sourceId={this.props.sourceId} inputLanguage={this.props.inputLanguage}
                                formType={this.props.formType} />;
                default:
                    return null;
            }
        }

        render() {
            return (
                <div className="query-toolbox">
                    {this._renderWidget()}
                    <ul>
                        <li>
                            <TRQueryTypeField formType={this.props.formType}
                                queryType={this.props.queryTypes[this.props.sourceId]}
                                sourceId={this.props.sourceId} />
                        </li>
                        {List.map(
                            (item, i) => <li key={i}>{item}</li>,
                            this._renderButtons()
                        )}
                    </ul>
                </div>
            );
        }
    }

    const BoundQueryToolbox = BoundWithProps<QueryToolboxProps, QueryFormModelState>(QueryToolbox, queryModel);

    // ------------------- <LposSelector /> -----------------------------

    const LposSelector:React.FC<{
        sourceId:string;
        formType:QueryFormType;
        wPoSList:Array<{v:string; n:string}>;
        lposValue:string;

    }> = (props) => {

        const handleLposChange = (evt) => {
            dispatcher.dispatch<Actions.QueryInputSetLpos>({
                name: ActionName.QueryInputSetLpos,
                payload: {
                    formType: props.formType,
                    sourceId: props.sourceId,
                    lpos: evt.target.value
                }
            });
        };

        return (
            <span>
                {he.translate('query__pos')}:{'\u00a0'}
                <select onChange={handleLposChange} value={props.lposValue}>
                    <option value="">-- {he.translate('query__not_specified')} --</option>
                    {props.wPoSList.map(item => {
                        return <option key={item.v} value={item.v}>{item.n}</option>;
                    })}
                </select>
            </span>
        );
    };

    // ------------------- <MatchCaseSelector /> -----------------------------

    const MatchCaseSelector:React.FC<{
        formType:QueryFormType;
        sourceId:string;
        matchCaseValue:boolean;
        disabled:boolean;

    }> = (props) => {

        const handleCheckbox = (evt) => {
            dispatcher.dispatch<Actions.QueryInputSetMatchCase>({
                name: ActionName.QueryInputSetMatchCase,
                payload: {
                    formType: props.formType,
                    sourceId: props.sourceId,
                    value: !props.matchCaseValue
                }
            });
        };

        return (
            <label title={props.disabled ? he.translate('query__icase_is_now_within_re') : null}>
                {he.translate('query__match_case')}:{'\u00a0'}
                <input type="checkbox" name="qmcase" value="1" checked={props.matchCaseValue}
                    onChange={handleCheckbox} disabled={props.disabled} />
            </label>
        );
    };

    // -------------------- <DefaultAttrSelector /> ------------------------

    const DefaultAttrSelector:React.FC<{
        defaultAttr:string;
        forcedAttr:string;
        attrList:Array<Kontext.AttrItem>;
        simpleQueryAttrSeq:Array<string>;
        sourceId:string;
        formType:QueryFormType;
        label:string;

    }> = (props) => (
        <span className="default-attr-selection">
            {props.label + ':\u00a0'}
            <DefaultAttrSelect defaultAttr={props.defaultAttr}
                forcedAttr={props.forcedAttr}
                attrList={props.attrList}
                simpleQueryAttrSeq={props.simpleQueryAttrSeq}
                sourceId={props.sourceId}
                formType={props.formType} />{'\u00a0'}
    </span>
    );

    // -------------------- <UseRegexpSelector /> --------------------------

    const UseRegexpSelector:React.FC<{
        value:boolean;
        formType:QueryFormType;
        sourceId:string;
        disabled:boolean;

    }> = (props) => {

        const handleClick = () => {
            dispatcher.dispatch<Actions.QueryInputToggleAllowRegexp>({
                name: ActionName.QueryInputToggleAllowRegexp,
                payload: {
                    formType: props.formType,
                    sourceId: props.sourceId
                }
            });
        }

        return (
            <span>
                <label>
                    {he.translate('query__simple_q_use_regexp')}:
                    <input type="checkbox" checked={props.value} onChange={handleClick}
                        disabled={props.disabled} />
                </label>
            </span>
        );
    };

    // ------------------- <SingleLineInput /> -----------------------------

    const SingleLineInput:React.FC<SingleLineInputProps & QueryFormModelState> = (props) => {

        const handleInputChange = (evt:React.ChangeEvent<HTMLInputElement>) => {
            dispatcher.dispatch<Actions.QueryInputSetQuery>({
                name: ActionName.QueryInputSetQuery,
                payload: {
                    formType: props.formType,
                    sourceId: props.sourceId,
                    query: evt.target.value,
                    rawAnchorIdx: props.refObject.current.selectionStart,
                    rawFocusIdx: props.refObject.current.selectionEnd,
                    insertRange: null
                }
            });
        };

        const handleKeyDown = (evt) => {
            if (evt.keyCode === Keyboard.Code.DOWN_ARROW &&
                    props.hasHistoryWidget &&
                    props.downArrowTriggersHistory[props.sourceId] &&
                        !props.historyIsVisible) {
                props.onReqHistory();

            } else if (evt.keyCode === Keyboard.Code.ESC) {
                props.onEsc();
            }
        };

        const handleKeyUp = (evt) => {
            if ((evt.keyCode === Keyboard.Code.LEFT_ARROW ||
                    evt.keyCode === Keyboard.Code.HOME ||
                    evt.keyCode === Keyboard.Code.END ||
                    evt.keyCode === Keyboard.Code.RIGHT_ARROW) && props.refObject.current) {
                dispatcher.dispatch<Actions.QueryInputMoveCursor>({
                    name: ActionName.QueryInputMoveCursor,
                    payload: {
                        formType: props.formType,
                        sourceId: props.sourceId,
                        rawAnchorIdx: props.refObject.current.selectionStart,
                        rawFocusIdx: props.refObject.current.selectionEnd
                    }
                });
            }
        }

        const handleClick = (evt) => {
            if (props.refObject.current) {
                dispatcher.dispatch<Actions.QueryInputMoveCursor>({
                    name: ActionName.QueryInputMoveCursor,
                    payload: {
                        formType: props.formType,
                        sourceId: props.sourceId,
                        rawAnchorIdx: props.refObject.current.selectionStart,
                        rawFocusIdx: props.refObject.current.selectionEnd
                    }
                });
            }
        };

        return <input className="simple-input" type="text"
                            spellCheck={false}
                            ref={props.refObject}
                            onChange={handleInputChange}
                            value={props.queries[props.sourceId]}
                            onKeyDown={handleKeyDown}
                            onKeyUp={handleKeyUp}
                            onClick={handleClick} />;
    }

    const BoundSingleLineInput = BoundWithProps<SingleLineInputProps, QueryFormModelState>(SingleLineInput, queryModel);

    // ------------------- <DefaultAttrSelect /> -----------------------------

    const DefaultAttrSelect:React.FC<{
        formType:QueryFormType;
        sourceId:string;
        forcedAttr:string;
        defaultAttr:string;
        simpleQueryAttrSeq:Array<string>;
        attrList:Array<Kontext.AttrItem>;

    }> = (props) => {

        const handleSelectChange = (evt) => {
            dispatcher.dispatch<Actions.QueryInputSetDefaultAttr>({
                name: ActionName.QueryInputSetDefaultAttr,
                payload: {
                    formType: props.formType,
                    sourceId: props.sourceId,
                    value: evt.target.value
                }
            });
        };

        if (props.forcedAttr) {
            return (
                <select className="DefaultAttrSelect" disabled={true} title={he.translate('query__implicit_attr_cannot_be_changed')}>
                    <option>{props.forcedAttr}</option>
                </select>
            );

        } else {
            return (
                <select className="DefaultAttrSelect" value={props.defaultAttr || ''} onChange={handleSelectChange}>
                    {!List.empty(props.simpleQueryAttrSeq) ?
                        <option value="">-- {he.translate('query__not_specified')} --</option> :
                        null}
                    {props.attrList.map(item => {
                        return <option key={item.n} value={item.n || ''}>{item.label}</option>;
                    })}
                </select>
            );
        }
    };

    // ------------------- <TRQueryInputField /> -----------------------------

    class TRQueryInputField extends React.PureComponent<TRQueryInputFieldProps & QueryFormModelState> {

        private _queryInputElement:React.RefObject<HTMLInputElement|HTMLTextAreaElement>;

        constructor(props) {
            super(props);
            this._queryInputElement = React.createRef();
            this._handleInputChange = this._handleInputChange.bind(this);
            this._toggleHistoryWidget = this._toggleHistoryWidget.bind(this);
            this.handleReqHistory = this.handleReqHistory.bind(this);
            this.handleInputEscKeyDown = this.handleInputEscKeyDown.bind(this);
            this.handleSuggestionItemClick = this.handleSuggestionItemClick.bind(this);
            this.handleQueryOptsClick = this.handleQueryOptsClick.bind(this);
        }

        _handleInputChange(evt:React.ChangeEvent<HTMLTextAreaElement|HTMLInputElement|HTMLPreElement>) {
            if (evt.target instanceof HTMLTextAreaElement || evt.target instanceof HTMLInputElement) {
                dispatcher.dispatch<Actions.QueryInputSetQuery>({
                    name: ActionName.QueryInputSetQuery,
                    payload: {
                        formType: this.props.formType,
                        sourceId: this.props.sourceId,
                        query: evt.target.value,
                        rawAnchorIdx: this._queryInputElement.current.selectionStart,
                        rawFocusIdx: this._queryInputElement.current.selectionEnd,
                        insertRange: null
                    }
                });
            }
        }

        _toggleHistoryWidget() {
            dispatcher.dispatch<Actions.ToggleQueryHistoryWidget>({
                name: ActionName.ToggleQueryHistoryWidget,
                payload: {
                    formType: this.props.formType,
                    sourceId: this.props.sourceId
                }
            });
            if (!this.props.historyVisible[this.props.sourceId] && this._queryInputElement.current) {
                this._queryInputElement.current.focus();
            }
        }

        private handleQueryOptsClick() {
            dispatcher.dispatch<Actions.QueryOptionsToggleForm>({
                name: ActionName.QueryOptionsToggleForm,
                payload: {
                    formType: this.props.formType,
                    sourceId: this.props.sourceId
                }
            });
        }

        componentDidMount() {
            if (this.props.takeFocus && this._queryInputElement.current) {
                this._queryInputElement.current.focus();
            }
        }

        componentDidUpdate(prevProps, prevState) {
            if (prevProps.historyVisible[this.props.sourceId] && !this.props.historyVisible &&
                    this._queryInputElement.current) {
                this._queryInputElement.current.focus();
            }
        }

        handleReqHistory():void {
            this._toggleHistoryWidget();
        }

        handleInputEscKeyDown():void {
            dispatcher.dispatch<Actions.ToggleQuerySuggestionWidget>({
                name: ActionName.ToggleQuerySuggestionWidget,
                payload: {
                    formType: this.props.formType,
                    sourceId: this.props.sourceId
                }
            });
        }

        handleSuggestionItemClick(onItemClick:string, value:string, attr:string):void {
            dispatcher.dispatch<PluginInterfaces.QuerySuggest.Actions.ItemClicked>({
                name: PluginInterfaces.QuerySuggest.ActionName.ItemClicked,
                payload: {
                    sourceId: this.props.sourceId,
                    formType: this.props.formType,
                    onItemClick,
                    value,
                    valueStartIdx: this.props.querySuggestions[this.props.sourceId].valuePosStart,
                    valueEndIdx: this.props.querySuggestions[this.props.sourceId].valuePosEnd,
                    attrStartIdx: this.props.querySuggestions[this.props.sourceId].attrPosStart,
                    attrEndIdx: this.props.querySuggestions[this.props.sourceId].attrPosEnd,
                    attr
                }
            });
            this._queryInputElement.current.focus();
        }

        _renderInput() {
            switch (this.props.queryType) {
                case 'simple':
                    return <BoundSingleLineInput
                                sourceId={this.props.sourceId}
                                refObject={this._queryInputElement as React.RefObject<HTMLInputElement>}
                                hasHistoryWidget={this.props.widgets.indexOf('history') > -1}
                                historyIsVisible={this.props.historyVisible[this.props.sourceId]}
                                onReqHistory={this.handleReqHistory}
                                onEsc={this.handleInputEscKeyDown} />;
                case 'advanced':
                    return this.props.useCQLEditor ?
                        <cqlEditorViews.CQLEditor
                                formType={this.props.formType}
                                sourceId={this.props.sourceId}
                                takeFocus={this.props.takeFocus}
                                onReqHistory={this.handleReqHistory}
                                onEsc={this.handleInputEscKeyDown}
                                hasHistoryWidget={this.props.widgets.indexOf('history') > -1}
                                historyIsVisible={this.props.historyVisible[this.props.sourceId]}
                                inputRef={this._queryInputElement as React.RefObject<HTMLPreElement>} /> :
                        <cqlEditorViews.CQLEditorFallback
                                formType={this.props.formType}
                                sourceId={this.props.sourceId}
                                inputRef={this._queryInputElement as React.RefObject<HTMLTextAreaElement>}
                                onReqHistory={this.handleReqHistory}
                                onEsc={this.handleInputEscKeyDown}
                                hasHistoryWidget={this.props.widgets.indexOf('history') > -1}
                                historyIsVisible={this.props.historyVisible[this.props.sourceId]} />;
            }
        }

        _renderInputOptions() {
            const customOpts = this.props.customOptions || [];
            switch (this.props.queryType) {
                case 'simple':
                    return (
                        <>
                            {!List.empty(customOpts) ?
                                <>
                                    {List.map(
                                        (opt, i) => (
                                            <div className="option custom" key={`item:${i}`}
                                                    style={{gridColumnEnd: `span ${opt.props.span || 1}`}}>
                                                {opt}
                                            </div>
                                        ),
                                        customOpts
                                    )}
                                </> :
                                null
                            }
                            <>
                                <div className={`option${this.props.useRegexp[this.props.sourceId] ? ' disabled' : ''}`}>
                                    <MatchCaseSelector matchCaseValue={this.props.matchCaseValues[this.props.sourceId]}
                                        sourceId={this.props.sourceId}
                                        formType={this.props.formType}
                                        disabled={this.props.useRegexp[this.props.sourceId]} />
                                </div>
                                <div className={`option${this.props.matchCaseValues[this.props.sourceId] ? ' disabled' : ''}`}>
                                    <UseRegexpSelector sourceId={this.props.sourceId} formType={this.props.formType}
                                            value={this.props.useRegexp[this.props.sourceId]}
                                            disabled={this.props.matchCaseValues[this.props.sourceId]} />
                                </div>
                                <div className="option">
                                    <DefaultAttrSelector
                                        label={he.translate('query__applied_attr')}
                                        sourceId={this.props.sourceId}
                                        defaultAttr={this.props.defaultAttrValues[this.props.sourceId]}
                                        forcedAttr={this.props.forcedAttr}
                                        attrList={this.props.attrList}
                                        simpleQueryAttrSeq={this.props.simpleQueryAttrSeq}
                                        formType={this.props.formType} />
                                </div>
                                <div className="option">
                                {Kontext.isWordLikePosAttr(this.props.defaultAttrValues[this.props.sourceId]) ?
                                    <LposSelector wPoSList={this.props.wPoSList}
                                        lposValue={this.props.lposValue}
                                        sourceId={this.props.sourceId}
                                        formType={this.props.formType}  /> :
                                    null
                                }
                                </div>
                            </>
                        </>
                    );
                case 'advanced':
                    return (
                        <>
                            {!List.empty(customOpts) ?
                                <div className="option-list-custom">
                                    {List.map(
                                        (opt, i) => <div key={`item:${i}`}>{opt}</div>,
                                        customOpts
                                    )}
                                </div> :
                                null
                            }
                            <div className="option-list">
                                <div>
                                    <DefaultAttrSelector
                                        label={he.translate('query__default_attr')}
                                        sourceId={this.props.sourceId}
                                        defaultAttr={this.props.defaultAttrValues[this.props.sourceId]}
                                        forcedAttr={this.props.forcedAttr}
                                        attrList={this.props.attrList}
                                        simpleQueryAttrSeq={this.props.simpleQueryAttrSeq}
                                        formType={this.props.formType} />
                                </div>
                            </div>
                        </>
                    );
            }
        }

        render() {
            return (
                <div>
                    <div className="query-area">
                        <BoundQueryToolbox
                            widgets={this.props.widgets}
                            tagHelperView={this.props.tagHelperView}
                            sourceId={this.props.sourceId}
                            toggleHistoryWidget={this._toggleHistoryWidget}
                            inputLanguage={this.props.inputLanguage}
                            qsAvailable={QueryFormModel.hasSuggestionsFor(
                                this.props.querySuggestions, this.props.sourceId,
                                querySuggest)} />
                        {this._renderInput()}
                        {this.props.historyVisible[this.props.sourceId] ?
                            <HistoryWidget
                                    queryStorageView={this.props.queryStorageView}
                                    sourceId={this.props.sourceId}
                                    onCloseTrigger={this._toggleHistoryWidget}
                                    formType={this.props.formType}/>
                            : null
                        }

                        {
                            !this.props.historyVisible[this.props.sourceId] &&
                            this.props.suggestionsVisible[this.props.sourceId] &&
                            QueryFormModel.hasSuggestionsFor(
                                this.props.querySuggestions, this.props.sourceId,
                                querySuggest) ?
                                <SuggestionsWidget
                                    qsuggPlugin={this.props.qsuggPlugin}
                                    suggestionData={this.props.querySuggestions}
                                    formType={this.props.formType}
                                    sourceId={this.props.sourceId}
                                    handleItemClick={this.handleSuggestionItemClick} />
                                : null
                        }
                        <BoundQueryHints />
                    </div>
                    <AdvancedFormFieldset
                            formVisible={this.props.queryOptionsVisible[this.props.sourceId]}
                            handleClick={this.handleQueryOptsClick}
                            htmlClass="query-options"
                            title={he.translate('query__specify_options')}>
                        <div className="options">
                            {this._renderInputOptions()}
                        </div>
                    </AdvancedFormFieldset>
                </div>
            );
        }
    }

    const BoundTRQueryInputField = BoundWithProps<TRQueryInputFieldProps, QueryFormModelState>(TRQueryInputField, queryModel);


    return {
        TRQueryInputField: BoundTRQueryInputField,
        TRPcqPosNegField: TRPcqPosNegField,
        TRIncludeEmptySelector: TRIncludeEmptySelector,
        AdvancedFormFieldset: AdvancedFormFieldset
    };

}