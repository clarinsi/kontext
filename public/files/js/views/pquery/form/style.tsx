/*
 * Copyright (c) 2021 Charles University, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2021 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright (c) 2021 Martin Zimandl <martin.zimandl@gmail.com>
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

import styled from 'styled-components';
import * as theme from '../../theme/default';


// ---------------- <PqueryFormSection /> -------------

export const PqueryFormSection = styled.section`

    margin: ${theme.pageFormMargin};

    form >* {
        margin-top: 1em;
    }

    .loader {
        margin: 0 1em;
    }

    .add {
        img {
            margin-right: 0.5em;
            width: 1em;
            height: 1em;
        }
    }
`;

// ------------------ <PqueryForm /> --------------------------

export const PqueryForm = styled.form`

    margin-top: 1.5em;

    .ExpandableArea > fieldset {
        margin-top: 1em;
        border: 1px solid ${theme.colorLightFrame};
        border-radius: ${theme.borderRadiusDefault};
    }

`;

// ---------------- <QueryRowDiv /> -------------

export const QueryRowDiv = styled.div`

    display: flex;
    flex-direction: row;
    align-items: center;

    img.loader {
        width: 1em;
        height: 1em;
    }
`;


// ---------------- <ParametersFieldset /> -------------

export const ParametersFieldset = styled.fieldset`

    display: flex;
    align-items: center;
    border: none;
    padding: ${theme.defaultFieldsetPadding};

    & >* {
        flex-grow: 1;
    }
`;

// ---------------- <ParameterField /> -------------

export const ParameterField = styled.span`

    border: none;

    label {
        margin: 0 0.5em;
    }
`;

//  --------------- <MinFreqField /> ----------------

export const MinFreqField = styled(ParameterField)`

    input {
        width: 3em;
    }

    input.error {
        background-color: ${theme.colorLightPink};
    }
`;

// ---------------- <BorderlessFieldset /> -------------

export const BorderlessFieldset = styled.fieldset`
    border: none;
    padding: 0px;
`;


// ---------------- <EditorFieldset /> -------------

export const EditorFieldset = styled.fieldset`
    border: none;
`;


// ---------------- <StylelessFieldset /> -------------

export const StylelessFieldset = styled(BorderlessFieldset)`
    margin: 0px;

    > *:not(:first-child) {
        margin-top: 1em;
    }
`;

// ---------------- <ExpressionRoleFieldset /> -------------

export const ExpressionRoleFieldset = styled(BorderlessFieldset)`
    margin: 2px 0px;

    input {
        width: 3em;
        margin-right: 0.5em;
    }

    input.error {
        background-color: ${theme.colorLightPink};
    }
`;

// ---------------- <VerticalSeparator /> -------------

export const VerticalSeparator = styled.span`
    margin: 0 1em;
    border-style: solid;
    border-color: ${theme.colorLogoBlue};
    border-width: 0 1px 0 0;
`;
