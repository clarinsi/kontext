/*
 * Copyright (c) 2015 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2015 Tomas Machalek <tomas.machalek@gmail.com>
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
import { Kontext } from './common';


export namespace CoreViews {

    export enum AutoWidth {
        WIDE = 'wide',
        NARROW = 'narrow'
    }

    export namespace ErrorBoundary {
        export type Component = React.ComponentClass<{}>;
    }

    // ---------------------------

    export namespace ModalOverlay {

        export interface Props {
            onCloseKey:()=>void;
            isScrollable?:boolean;
            children:React.ReactNode;
        }

        export interface State {
        }

        export type Component = React.ComponentClass<Props>;
    }

    // ---------------------------

    export namespace PopupBox {

        export interface Props {

            /**
             * a custom action to be performed once the component is mounted
             */
            onReady?:(elm:HTMLElement)=>void;

            /**
             * a custom action to be performed when user clicks 'close'
             */
            onCloseClick:()=>void;

            /**
             * An optional handler triggered in case user clicks anywhere
             * within PopupBox. This can be used e.g. to regain focus.
             */
            onAreaClick?:()=>void;

            status?:Kontext.UserMessageTypes;

            /**
             * an optional inline CSS
             */
            customStyle?:React.CSSProperties;

            /**
             * if true then the "close" button will take the focus
             * allowing instant closing by ESC or handling keys
             * by a custom handler (see the next prop)
             */
            takeFocus?:boolean;

            /**
             * an optional function called in case of a 'onKeyDown' event
             */
            keyPressHandler?:(evt:React.SyntheticEvent<{}>)=>void;

            customClass?:string;

            autoWidth?:CoreViews.AutoWidth;

            children:React.ReactNode;
        }

        export interface State {}

        export type Component = React.ComponentClass<Props>;

    }

    // -------------------------------

    export namespace ImgWithHighlight {

        export interface Props {
            src:string;
            src2?:string;
            alt:string;
            isHighlighted:boolean;
            htmlClass?:string;
            title?:string;
            style?:{[prop:string]:string};
        }

        export type Component = React.FC<Props>;
    }

    // -------------------------------

    export namespace ImgWithMouseover {

        export interface Props {
            src:string;
            src2?:string;
            htmlClass?:string;
            clickHandler?:()=>void;
            alt:string;
            title?:string;
            style?:{[prop:string]:string};
        }

        export type Component = React.FC<Props>;
    }

    // -------------------------------

    export namespace CloseableFrame {

        export interface Props {
            onCloseClick:()=>void;
            onReady?:(elm:HTMLElement)=>void;
            customClass?:string;
            scrollable?:boolean;
            autoWidth?:CoreViews.AutoWidth;
            label:string;
            children:React.ReactNode;
        }

        export type Component = React.ComponentClass<Props>;

    }

    // -------------------------------

    export namespace InlineHelp {

        export interface Props {
            children:React.ReactNode;
            noSuperscript?:boolean;
            customStyle?:{[key:string]:string};
            url?:string;
        }

        export interface State {
            helpVisible:boolean;
        }

        export type Component = React.ComponentClass<Props>;

    }

    // -------------------------------

    export namespace Abbreviation {

        export interface Props {
            value:string;
            desc:string;
            customStyle?:{[key:string]:string};
            url?:string;
        }

        export type Component = React.ComponentClass<Props>;
    }

    // -------------------------------

    export namespace Message {

        export interface Props {
            messageId:string;
            messageType:string;
            messageText:string;
            ttl:number;
            timeFadeout:number;
        }
    }

    // -------------------------------

    export namespace Messages {

        export interface Props {}

        export type Component = React.ComponentClass<{}>;
    }

    // -------------------------------

    export namespace FadeInFrame {

        export interface Props {
            opacity:number;
            children:React.ReactNode;
        }

        export type Component = React.FC<Props>;
    }

    // -------------------------------

    export namespace IssueReportingLink {

        export interface Props {
            url:string;
            blank_window:boolean;
            type:string;
            label:string;
            onClick:()=>void;
        }

        export type Component = React.FC<Props>;
    }

    // -------------------------------

    export namespace AjaxLoaderImage {
        export interface Props {
            htmlClass?:string;
            title?:string;
        }
        export type Component = React.FC<Props>;
    }

    // -------------------------------

    export namespace AjaxLoaderBarImage {
        export interface Props {
            htmlClass?:string;
            title?:string;
        }
        export type Component = React.FC<Props>;
    }

    // -------------------------------

    export namespace CorpnameInfoTrigger {

        export interface Props {
            corpname:string;
            usesubcorp:string;
            origSubcorpName:string;
            foreignSubcorp:boolean;
            humanCorpname:string;
        }

        export type Component = React.FC<Props>;

    }

    export namespace Shortener {

        export interface Props {
            text:string;
            limit?:number;
            className?:string;
        }

        export type Component = React.FC<Props>;
    }

    export namespace StatusIcon {

        export interface Props {
            status:Kontext.UserMessageTypes;
            htmlClass?:string;
            inline?:boolean;
        }

        export type Component = React.FC<Props>;
    }

    export namespace DelItemIcon {

        export interface Props {
            className?:string;
            title?:string;
            disabled?:boolean;
            onClick?:()=>void;
        }

        export type Component = React.FC<Props>;
    }

    export namespace ValidatedItem {

        export interface Props {
            invalid:boolean;
            errorDesc?:string;
        }

        export type Component = React.FC<Props>;
    }

    export namespace TabButton {

        export interface Props {
            isActive:boolean;
            label:string;
            htmlClass?:string;
            onClick:()=>void;
        }

        export type Component = React.FC<Props>;
    }

    export namespace TabView {

        export interface Props {
            items:Array<{id:string, label:string}>;
            defaultId?:string;
            className?:string;
            noButtonSeparator?:boolean;
            callback?:(id:string) => void;
        }

        export type Component = React.FC<Props>;
    }

    export namespace PlusButton {

        export interface Props {
            mouseOverHint?:string;
            htmlClass?:string;
            onClick:()=>void;
        }

        export type Component = React.FC<Props>;
    }

    export namespace Calendar {

        export interface Props {
            onClick:(date:Date|null)=>void;
            currDate?:Date;
            firstDayOfWeek?:'mo'|'su'|'sa';
        }

        export type Component = React.FC<Props>;
    }

    export namespace ToggleSwitch {

        export interface Props {
            onChange?:(checked?:boolean)=>void;
            checked?:boolean;
            disabled?:boolean;
            id?:string;
        }

        export interface State {
            checked:boolean;
            imgClass:string;
        }

        export type Component = React.ComponentClass<Props, State>;
    }

    export namespace ExpandButton {

        export interface Props {
            isExpanded:boolean;
            onClick?:(isExpanded:boolean)=>void;
        }

        export type Component = React.FC<Props>;
    }

    export namespace ExpandableArea {

        export interface Props {
            initialExpanded:boolean;
            label:string;
            alwaysExpanded?:boolean;
        }

        export type Component = React.FC<Props>;
    }

    export namespace UnsupportedRenderer {

        export interface Props {}

        export type Component = React.FC<Props>;
    }

    export namespace KwicRangeSelector {

        export interface Props {
            isKwicExcluded:boolean;
            rangeSize:number;
            initialLeft?:number;
            initialRight?:number;
            onClick:(lft:number, rgt:number, includesKwic:boolean)=>void;
        }

        export type Component = React.FC<Props>;
    }

    // -------------------------------

    export interface Runtime {
        ErrorBoundary: ErrorBoundary.Component;
        ModalOverlay: ModalOverlay.Component;
        PopupBox:PopupBox.Component;
        ImgWithHighlight:ImgWithHighlight.Component;
        ImgWithMouseover:ImgWithMouseover.Component;
        CloseableFrame:CloseableFrame.Component;
        InlineHelp:InlineHelp.Component;
        Abbreviation:Abbreviation.Component;
        Messages:Messages.Component;
        IssueReportingLink:IssueReportingLink.Component;
        AjaxLoaderImage:AjaxLoaderImage.Component;
        AjaxLoaderBarImage:AjaxLoaderBarImage.Component;
        CorpnameInfoTrigger:CorpnameInfoTrigger.Component;
        Shortener:Shortener.Component;
        StatusIcon:StatusIcon.Component;
        DelItemIcon:DelItemIcon.Component;
        ValidatedItem:ValidatedItem.Component;
        TabView:TabView.Component;
        PlusButton:PlusButton.Component;
        Calendar:Calendar.Component;
        ExpandButton:ExpandButton.Component;
        ExpandableArea:ExpandableArea.Component;
        KwicRangeSelector:KwicRangeSelector.Component;
        ToggleSwitch:ToggleSwitch.Component;
        UnsupportedRenderer:UnsupportedRenderer.Component;
    }
}


