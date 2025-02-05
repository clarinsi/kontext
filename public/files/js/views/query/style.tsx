/*
 * Copyright (c) 2021 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2021 Tomas Machalek <tomas.machalek@gmail.com>
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
import * as theme from '../theme/default';

// ---------------- <ExpandableSectionLabel /> -----------------------------------

export const ExpandableSectionLabel = styled.h2`
    margin: 0 0 0.4em 0;
    padding: 0.2em;
    font-size: 1.05em;
    font-weight: normal;

    .ExpandButton {
        margin-right: 0.7em;
    }

    a,
    span {
        font-weight: normal;
        color: ${theme.colorLogoBlue};
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }
`;

// ---------------- <SaveHintParagraph /> -----------------------------------

export const SaveHintParagraph = styled.p`

    width: 30em;
    white-space: initial;
    color: ${theme.colorDefaultText};

    .icon {
        display: inline-block;
        vertical-align: middle;
        margin-right: 0.4em;

        img {
            width: 1.2em;
        }
    }
`;


// ---------------- <PersistentConcordanceForm /> -----------------------

export const PersistentConcordanceForm = styled.form`

    input {
        font-size: 1.5em;
        width: 30em;
        display: inline-block;
        margin-top: 0.4em;
        margin-bottom: 1em;
        color: ${theme.colorSuperlightText};
    }

    input.archived {
        color: ${theme.colorDefaultText};
    }

`;