#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import re
def to_camelcase(s):
    return re.sub(r'(?<!\.)_([a-zA-Z])', lambda m: m.group(1).upper(), s)


filename = sys.argv[1]

infp = open(filename)
out = open(filename + '.out', 'w+b')

for line in infp:
    new_line = to_camelcase(line)
    out.write(new_line)

infp.close()
out.close()
