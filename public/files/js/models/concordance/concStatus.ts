/*
 * Copyright (c) 2021 Charles University, Faculty of Arts,
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

import { of as rxOf, zip } from 'rxjs';
import { expand, takeWhile, delay, concatMap, take } from 'rxjs/operators';
import { HTTP, List } from 'cnc-tskit';
import { PageModel } from "../../app/page";
import { AjaxResponse } from '../../types/ajaxResponses';
import { ActionName, Actions } from './actions';


export class HitReloader {

    private readonly layoutModel:PageModel;

    private static CHECK_CONC_DECAY = 1.08;

    private static CHECK_CONC_MAX_WAIT = 500;

    constructor(layoutModel:PageModel) {
        this.layoutModel = layoutModel;
    }


    init():void {
        const linesPerPage = this.layoutModel.getConf<number>('ItemsPerPage');
        const applyData = (data:AjaxResponse.ConcStatus) => {
            this.layoutModel.dispatcher.dispatch<Actions.AsyncCalculationUpdated>({
                name: ActionName.AsyncCalculationUpdated,
                payload: {
                    finished: !!data.finished,
                    concsize: data.concsize,
                    relconcsize: data.relconcsize,
                    arf: data.arf,
                    fullsize: data.fullsize,
                    availPages: Math.ceil(data.concsize / linesPerPage)
                }
            });
        };

        if (this.layoutModel.supportsWebSocket()) {
            const [checkConc$, concCacheStatusSocket] = this.layoutModel.openWebSocket<{
                user_id:number;
                corp_id:string;
                subc_path:string;
                conc_id:string}, AjaxResponse.ConcStatus>('conc_cache_status');
            concCacheStatusSocket.subscribe(
                (response) => {
                    applyData(response);
                },
                (err) => {
                    this.layoutModel.dispatcher.dispatch<Actions.AsyncCalculationFailed>({
                        name: ActionName.AsyncCalculationFailed,
                        payload: {}
                    });
                    this.layoutModel.showMessage('error', err);
                }
            );
            checkConc$.next({
                user_id: this.layoutModel.getConf<number>('userId'),
                corp_id: this.layoutModel.getCorpusIdent().id,
                subc_path: this.layoutModel.getCorpusIdent().usesubcorp,
                conc_id: this.layoutModel.getConf<string>('concPersistenceOpId')
            });

        } else {
            rxOf(HitReloader.CHECK_CONC_DECAY).pipe(
                expand(
                    (interval) => rxOf(interval * HitReloader.CHECK_CONC_DECAY)
                ),
                take(100), // just a safe limit
                concatMap(v => rxOf(v).pipe(delay(v * 1000))),
                concatMap(
                    (interval) => zip(
                        this.layoutModel.ajax$<AjaxResponse.ConcStatus>(
                            HTTP.Method.GET,
                            this.layoutModel.createActionUrl('get_conc_cache_status'),
                            this.layoutModel.exportConcArgs()
                        ),
                        rxOf(interval)
                    )
                ),
                takeWhile(
                    ([response, interval]) => interval < HitReloader.CHECK_CONC_MAX_WAIT &&
                        !response.finished,
                    true // true => emit also the last item (which already breaks the predicate)
                ),
            ).subscribe(
                ([response,]) => {
                    applyData(response);
                },
                (err) => {
                    this.layoutModel.dispatcher.dispatch<Actions.AsyncCalculationFailed>({
                        name: ActionName.AsyncCalculationFailed,
                        payload: {}
                    });
                    this.layoutModel.showMessage('error', err);
                }
            );
        }
    }
}