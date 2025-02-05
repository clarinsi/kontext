# Copyright(c) 2021 Charles University in Prague, Faculty of Arts,
#                   Institute of the Czech National Corpus
# Copyright(c) 2021 Tomas Machalek <tomas.machalek@gmail.com>
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

from typing import Optional
import re


class ConcordanceException(Exception):
    pass


class ConcordanceQuerySyntaxError(ConcordanceException):
    pass


class ConcordanceQueryParamsError(ConcordanceException):
    pass


class EmptyParallelCorporaIntersection(ConcordanceException):
    pass


class UnknownConcordanceAction(ConcordanceException):
    pass


class ConcCalculationStatusException(ConcordanceException):

    def __init__(self, msg, orig_error=None):
        super(ConcCalculationStatusException, self).__init__('{0}: {1}'.format(msg, orig_error))
        self._orig_error = orig_error

    @property
    def orig_error(self):
        return self._orig_error


class ConcNotFoundException(ConcordanceException):
    pass


class BrokenConcordanceException(ConcordanceException):
    pass


def extract_manatee_syntax_error(err: Exception) -> Optional[ConcordanceQuerySyntaxError]:
    """
    Test and extract Manatee syntax error. In case of a match,
    a normalized er
    """
    msg = str(err)
    if isinstance(err, RuntimeError) and ('syntax error' in msg or 'unexpected character' in msg):
        srch = re.match(r'unexpected character(.*)at position (\d+)', msg)
        if srch:
            return ConcordanceQuerySyntaxError(
                'Syntax error at position {}. Please check the query and its type.'.format(srch.group(2)))
        else:
            return ConcordanceQuerySyntaxError('Syntax error. Please check the query and its type')
    return None
