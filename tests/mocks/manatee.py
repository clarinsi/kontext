# Copyright (c) 2017 Charles University in Prague, Faculty of Arts,
#                    Institute of the Czech National Corpus
# Copyright (c) 2017 Tomas Machalek <tomas.machalek@gmail.com>
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
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA
# 02110-1301, USA.

from fallback_corpus import EmptyCorpus


def version():
    return 'manatee-mock'


class Concordance(object):
    pass


class CorpusManager(object):

    def get_Corpus(self, name, subcname=None):
        ans = EmptyCorpus()
        ans.corpname = name
        ans.subcname = subcname
        ans.size = 3000
        ans.search_size = lambda: 4000
        return ans

