# Copyright (c) 2018 Charles University, Faculty of Arts,
#                    Institute of the Czech National Corpus
# Copyright (c) 2018 Tomas Machalek <tomas.machalek@gmail.com>
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; version 2
# dated June, 1991.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

import os
import sys
import time
import re
from lxml import etree
import sqlite3
import argparse
from hashlib import md5
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from plugins.abstract.corparch.install import InstallJson, InstallCorpusInfo


class Shared(InstallCorpusInfo):

    def __init__(self, reg_path):
        super(Shared, self).__init__(reg_path)
        self._desc = {}
        self._ttdesc_id = 0
        self._articles = {}  # entry hash => db ID
        self._reg_path = reg_path

    def get_ref_ttdesc(self, ident):
        return self._desc.get(ident, [])

    def add_ref_art(self, ident, values):
        self._desc[ident] = values

    @property
    def ttdesc_id_inc(self):
        self._ttdesc_id += 1
        return self._ttdesc_id

    @property
    def ttdesc_id(self):
        return self._ttdesc_id

    def reuse_article(self, entry):
        ahash = md5(entry).hexdigest()
        if ahash in self._articles:
            return self._articles[ahash]
        return None

    def add_article(self, entry, db_id):
        ahash = md5(entry).hexdigest()
        self._articles[ahash] = db_id

    def registry_exists(self, corpus_id, variant):
        if variant:
            return os.path.exists(os.path.join(self._reg_path, variant, corpus_id))
        return os.path.exists(os.path.join(self._reg_path, corpus_id))


def decode_bool(v):
    ans = False
    if v is not None:
        if v.isdigit():
            ans = bool(int(v))
        elif v.lower() == 'true':
            ans = True
        elif v.lower() == 'false':
            ans = False
    return ans


def new_cursor(db):
    return db.cursor()


def prepare_tables(db):
    cursor = new_cursor(db)
    cursor.execute('PRAGMA foreign_keys = OFF;')
    cursor.execute('DELETE FROM corpus_posattr')
    cursor.execute('DELETE FROM corpus_structattr')
    cursor.execute('DELETE FROM corpus_structure')
    cursor.execute('DELETE FROM kontext_article')
    cursor.execute('DELETE FROM kontext_corpus')
    cursor.execute('DELETE FROM kontext_corpus_alignment')
    cursor.execute('DELETE FROM kontext_corpus_article')
    cursor.execute('DELETE FROM kontext_corpus_user')
    cursor.execute('DELETE FROM kontext_keyword')
    cursor.execute('DELETE FROM kontext_keyword_corpus')
    cursor.execute('DELETE FROM kontext_tckc_corpus')
    cursor.execute('DELETE FROM kontext_ttdesc')
    cursor.execute('DELETE FROM registry_conf')
    cursor.execute('DELETE FROM registry_variable')

    sql_path = os.path.join(os.path.dirname(__file__), './tables.sql')
    with open(sql_path) as fr:
        db.executescript(' '.join(fr.readlines()))


def fetch_structattr(s):
    if s is None or s == '':
        s = '.'
    return tuple(x if x else None for x in s.split('.'))


def create_corp_record(node, db, shared, json_out, variant):
    ident = node.attrib['ident'].lower()
    web = node.attrib['web'] if 'web' in node.attrib else None
    tagset = node.attrib.get('tagset', None)
    speech_segment_struct, speech_segment_attr = fetch_structattr(
        node.attrib.get('speech_segment', None))
    default_virt_keyboard = node.attrib.get('default_virt_keyboard', None)
    speaker_id_struct, speaker_id_attr = fetch_structattr(node.attrib.get('speaker_id_attr', None))
    speech_overlap_struct, speech_overlap_attr = fetch_structattr(
        node.attrib.get('speech_overlap_attr', None))
    speech_overlap_val = node.attrib.get('speech_overlap_val', None)
    collator_locale = node.attrib.get('collator_locale', 'en_US')
    use_safe_font = decode_bool(node.attrib.get('use_safe_font', 'false'))
    sentence_struct = node.attrib['sentence_struct'] if 'sentence_struct' in node.attrib else None
    curr_time = time.time()
    group_name, version = InstallJson.create_sorting_values(ident)

    cursor = new_cursor(db)
    cursor.execute('INSERT INTO kontext_corpus (id, group_name, version, created, updated, active, web, '
                   'tagset, collator_locale, speech_overlap_val, use_safe_font, size, default_virt_keyboard) '
                   'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                   (ident, group_name, version, int(curr_time), int(curr_time), 1, web, tagset,
                    collator_locale, speech_overlap_val,
                    use_safe_font, shared.get_corpus_size(ident), default_virt_keyboard))

    # dependent structures and attrs
    if speech_segment_struct and speech_segment_attr:
        create_structattr(db, ident, speech_segment_struct, speech_segment_attr)

    if speaker_id_attr and speaker_id_struct:
        create_structattr(db, ident, speaker_id_struct, speaker_id_attr)

    if speech_overlap_struct and speech_overlap_attr:
        create_structattr(db, ident, speech_overlap_struct, speech_overlap_attr)

    if sentence_struct:
        create_structure(db, ident, sentence_struct)

    cursor.execute('UPDATE kontext_corpus SET '
                   'sentence_struct = ?, '
                   'speech_segment_struct = ?, speech_segment_attr = ?, speaker_id_struct = ?, '
                   'speaker_id_attr = ?, speech_overlap_struct = ?, speech_overlap_attr = ? '
                   'WHERE id = ?', (sentence_struct, speech_segment_struct, speech_segment_attr,
                                    speaker_id_struct, speaker_id_attr, speech_overlap_struct, speech_overlap_attr,
                                    ident))
    # json generator
    json_out.switch_to(ident)
    json_out.current.ident = ident
    json_out.current.web = web
    json_out.current.sentence_struct = sentence_struct
    json_out.current.tagset = tagset
    json_out.current.speech_segment = '{0}.{1}'.format(speech_segment_struct, speech_segment_attr)
    json_out.current.speaker_id_attr = speaker_id_attr
    json_out.current.speech_overlap_attr = speech_overlap_attr
    json_out.current.speech_overlap_val = speech_overlap_val
    json_out.current.collator_locale = collator_locale
    json_out.use_safe_font = use_safe_font
    create_metadata_record(db, shared, node, ident, json_out.current)
    json_out.metadata.default_virt_keyboard = default_virt_keyboard
    parse_tckc(node, db, ident, json_out.current)


def structure_exists(db, corpus_id, struct_name):
    cursor = new_cursor(db)
    cursor.execute('SELECT COUNT(*) AS num FROM corpus_structure WHERE corpus_id = ? AND name = ? LIMIT 1',
                   (corpus_id, struct_name))
    row = cursor.fetchone()
    return row and row['num'] > 0


def create_structure(db, corpus_id, struct_name):
    if not structure_exists(db, corpus_id, struct_name):
        cursor = new_cursor(db)
        cursor.execute(
            'INSERT INTO corpus_structure (corpus_id, name) VALUES (?, ?)', (corpus_id, struct_name))


def create_structattr(db, corpus_id, struct_name, structattr_name):
    cursor = new_cursor(db)
    if not structure_exists(db, corpus_id, struct_name):
        create_structure(db, corpus_id, struct_name)
    cursor.execute('INSERT INTO corpus_structattr (corpus_id, structure_name, name) VALUES (?, ?, ?)',
                   (corpus_id, struct_name, structattr_name))


def parse_meta_desc(meta_elm, db, shared, corpus_id, json_out):
    ans = {}
    desc_all = meta_elm.findall('desc')
    cursor = new_cursor(db)
    if len(desc_all) == 1 and 'ref' in list(desc_all[0].keys()):
        message_key = desc_all[0].attrib['ref']
        value = shared.get_ref_ttdesc(message_key)
        cursor.execute(
            'UPDATE kontext_corpus SET ttdesc_id = ? WHERE id = ?', (value, corpus_id))
    elif len(desc_all) > 0:
        text_cs = ''
        text_en = ''
        ident = None
        for d in desc_all:
            lang_code = d.attrib['lang']
            if lang_code == 'en':
                text_en = d.text
            elif lang_code == 'cs':
                text_cs = d.text
            if 'ident' in list(d.keys()):
                ident = d.attrib['ident']
        cursor.execute('INSERT INTO kontext_ttdesc (id, text_cs, text_en) VALUES (?, ?, ?)',
                       (shared.ttdesc_id_inc, text_cs, text_en))
        cursor.execute(
            'UPDATE kontext_corpus SET ttdesc_id = ? WHERE id = ?', (shared.ttdesc_id, corpus_id))
        json_out.metadata.desc = shared.ttdesc_id
        if ident:
            shared.add_ref_art(ident, shared.ttdesc_id)
    return ans


def parse_keywords(elm, db, shared, corpus_id, json_out):
    cursor = new_cursor(db)
    for k in elm.findall('keywords/item'):
        cursor.execute('INSERT INTO kontext_keyword_corpus (corpus_id, keyword_id) VALUES (?, ?)',
                       (corpus_id, k.text.strip()))
        json_out.metadata.keywords.append(k.text.strip())


def parse_tckc(elm, db, corpus_id, json_out):
    cursor = new_cursor(db)
    token_connect_elm = elm.find('token_connect')
    if token_connect_elm is not None:
        for p in token_connect_elm.findall('provider'):
            cursor.execute('INSERT INTO kontext_tckc_corpus (corpus_id, provider, type) VALUES (?, ?, ?)',
                           (corpus_id, p.text.strip(), 'tc'))
            json_out.token_connect.append(p.text.strip())

    kwic_connect_elm = elm.find('kwic_connect')
    if kwic_connect_elm is not None:
        for p in kwic_connect_elm.findall('provider'):
            cursor.execute('INSERT INTO kontext_tckc_corpus (corpus_id, provider, type) VALUES (?, ?, ?)',
                           (corpus_id, p.text.strip(), 'kc'))
            json_out.kwic_connect.append(p.text.strip())


def create_metadata_record(db, shared, node, corpus_id, json_out):

    def clean_reference(s):
        return re.sub(r'\s+', ' ', s.strip())

    def add_article(entry, role):
        cursor = new_cursor(db)
        nid = shared.reuse_article(entry)
        if nid is None:
            cursor.execute('INSERT INTO kontext_article (entry) VALUES (?)', (entry,))
            cursor.execute('SELECT last_insert_rowid() AS last_id')
            nid = cursor.fetchone()['last_id']
        shared.add_article(entry, nid)
        cursor.execute('INSERT INTO kontext_corpus_article (corpus_id, article_id, role) '
                       'VALUES (?, ?, ?)', (corpus_id, nid, role))
        return nid

    meta_elm = node.find('metadata')
    if meta_elm is not None:
        db_path = getattr(meta_elm.find('database'), 'text', None)
        label_struct, label_attr = fetch_structattr(
            getattr(meta_elm.find('label_attr'), 'text', None))
        id_struct, id_attr = fetch_structattr(getattr(meta_elm.find('id_attr'), 'text', None))
        is_feat = 1 if meta_elm.find('featured') is not None else 0

        if label_attr and label_struct:
            create_structattr(db, corpus_id, label_struct, label_attr)

        if id_attr and id_struct:
            create_structattr(db, corpus_id, id_struct, id_attr)

        cursor = new_cursor(db)
        cursor.execute('UPDATE kontext_corpus SET '
                       'text_types_db = ?, bib_label_struct = ?, bib_label_attr = ?, '
                       'bib_id_struct = ?, bib_id_attr = ?, featured = ? '
                       'WHERE id = ?', (db_path, label_struct, label_attr, id_struct, id_attr, is_feat, corpus_id))
        json_out.metadata.database = db_path
        json_out.metadata.label_attr = '{0}.{1}'.format(label_struct, label_attr)
        json_out.metadata.id_attr = '{0}.{1}'.format(id_struct, id_attr)
        json_out.metadata.featured = is_feat
        json_out.metadata.keywords = []

        ref_elm = node.find('reference')
        if ref_elm is not None:
            default_ref = getattr(ref_elm.find('default'), 'text', None)
            if default_ref is not None:
                default_ref = clean_reference(default_ref)
            articles = [clean_reference(x.text) for x in ref_elm.findall('article')]
            other_bibliography = getattr(ref_elm.find('other_bibliography'), 'text', None)
            if other_bibliography is not None:
                other_bibliography = clean_reference(other_bibliography)
        else:
            default_ref = None
            articles = []
            other_bibliography = None

        if default_ref:
            json_out.reference.default = add_article(default_ref, 'default')
        for art in articles:
            json_out.reference.other_bibliography = add_article(art, 'standard')
        if other_bibliography:
            json_out.reference.articles.append(add_article(other_bibliography, 'other'))

        parse_meta_desc(meta_elm, db, shared, corpus_id, json_out)
        parse_keywords(meta_elm, db, shared, corpus_id, json_out)


def parse_keywords_def(root, db):
    srch = root.findall('corplist/keywords/keyword')
    cursor = new_cursor(db)
    for item in srch:
        label_cs = None
        label_en = None
        label_all = item.findall('label')
        for label_item in label_all:
            if label_item.attrib['lang'] == 'en':
                label_en = label_item.text.strip()
            elif label_item.attrib['lang'] == 'cs':
                label_cs = label_item.text.strip()
        cursor.execute('INSERT INTO kontext_keyword (id, label_cs, label_en, color) '
                       'VALUES (?, ?, ?, ?)', (item.attrib['ident'], label_cs, label_en,
                                               item.attrib['color'] if 'color' in item.attrib else None))


def parse_corplist(path, db, shared, json_out, variant, verbose):
    with open(path) as f:
        prepare_tables(db)
        xml = etree.parse(f)

        parse_keywords_def(xml, db)

        corpora = xml.findall('//corpus')
        for c in corpora:
            try:
                create_corp_record(c, db, shared, json_out, variant)
            except Exception as ex:
                print(('Skipping corpus [{0}] due to error: {1}'.format(c.attrib['ident'], ex)))
                if verbose:
                    import traceback
                    traceback.print_exc()
        db.commit()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Import existing corplist.xml into a new sqlite3 database')
    parser.add_argument('corplist', metavar='CORPLIST', type=str)
    parser.add_argument('dbpath', metavar='DBPATH', type=str)
    parser.add_argument('-s', '--schema-only', metavar='SCHEMA_ONLY',
                        action='store_const', const=True)
    parser.add_argument('-j', '--json-out', metavar='JSON_OUT', type=str,
                        help='A directory where corpus installation JSON should be stored')
    parser.add_argument('-r', '--reg-path', type=str, default='',
                        help='Path to registry files')
    parser.add_argument('-a', '--variant', type=str,
                        help='Try to search for alternative registry in a directory with this name')
    parser.add_argument('-v', '--verbose', action='store_const', const=True,
                        help='Print some additional (error) information')
    args = parser.parse_args()
    with sqlite3.connect(args.dbpath) as db:
        db.row_factory = sqlite3.Row
        if args.schema_only:
            prepare_tables(db)
        else:
            ijson = InstallJsonDir(args.json_out)
            parse_corplist(path=args.corplist, db=db, shared=Shared(reg_path=args.reg_path), json_out=ijson,
                           variant=args.variant, verbose=args.verbose)
            ijson.write()
        db.commit()
