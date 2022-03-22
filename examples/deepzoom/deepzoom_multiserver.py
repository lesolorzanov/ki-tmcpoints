#!/usr/bin/env python
#
# deepzoom_multiserver - Example web application for viewing multiple slides
#
# Copyright (c) 2010-2015 Carnegie Mellon University
#
# This library is free software; you can redistribute it and/or modify it
# under the terms of version 2.1 of the GNU Lesser General Public License
# as published by the Free Software Foundation.
#
# This library is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
# or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public
# License for more details.
#
# You should have received a copy of the GNU Lesser General Public License
# along with this library; if not, write to the Free Software Foundation,
# Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
#

from collections import OrderedDict
from functools import cache
from io import BytesIO
from optparse import OptionParser
import os
from threading import Lock

from flask import Flask, abort, make_response, render_template, url_for

if os.name == 'nt':
    _dll_path = os.getenv('OPENSLIDE_PATH')
    if _dll_path is not None:
        if hasattr(os, 'add_dll_directory'):
            # Python >= 3.8
            with os.add_dll_directory(_dll_path):
                import openslide
        else:
            # Python < 3.8
            _orig_path = os.environ.get('PATH', '')
            os.environ['PATH'] = _orig_path + ';' + _dll_path
            import openslide

            os.environ['PATH'] = _orig_path
else:
    import openslide

from openslide import OpenSlide, OpenSlideError
from openslide.deepzoom import DeepZoomGenerator

SLIDE_DIR = '.'
SLIDE_CACHE_SIZE = 10
DEEPZOOM_FORMAT = 'jpeg'
DEEPZOOM_TILE_SIZE = 254
DEEPZOOM_OVERLAP = 1
DEEPZOOM_LIMIT_BOUNDS = True
DEEPZOOM_TILE_QUALITY = 75

app = Flask(__name__)
app.config.from_object(__name__)
app.config.from_envvar('DEEPZOOM_MULTISERVER_SETTINGS', silent=True)
slides_context={}
slides_context={"slides":[], "slide_names":[], "slide_formats":[]}

class _SlideCache:
    def __init__(self, cache_size, dz_opts):
        self.cache_size = cache_size
        self.dz_opts = dz_opts
        self._lock = Lock()
        self._cache = OrderedDict()

    def get(self, path):
        with self._lock:
            if path in self._cache:
                # Move to end of LRU
                slide = self._cache.pop(path)
                self._cache[path] = slide
                return slide

        osr = OpenSlide(path)
        slide = DeepZoomGenerator(osr, **self.dz_opts)
        try:
            mpp_x = osr.properties[openslide.PROPERTY_NAME_MPP_X]
            mpp_y = osr.properties[openslide.PROPERTY_NAME_MPP_Y]
            slide.mpp = (float(mpp_x) + float(mpp_y)) / 2
        except (KeyError, ValueError):
            slide.mpp = 0

        with self._lock:
            if path not in self._cache:
                if len(self._cache) == self.cache_size:
                    self._cache.popitem(last=False)
                self._cache[path] = slide
        return slide


class _Directory:
    def __init__(self, basedir, relpath=''):
        self.name = os.path.basename(relpath)
        self.children = []
        for name in sorted(os.listdir(os.path.join(basedir, relpath))):
            cur_relpath = os.path.join(relpath, name)
            cur_path = os.path.join(basedir, cur_relpath)
            if os.path.isdir(cur_path):
                cur_dir = _Directory(basedir, cur_relpath)
                if cur_dir.children:
                    self.children.append(cur_dir)
            elif OpenSlide.detect_format(cur_path):
                self.children.append(_SlideFile(cur_relpath))


class _SlideFile:
    def __init__(self, relpath):
        self.name = os.path.basename(relpath)
        self.url_path = relpath


def _removeFormat(astring):
    newstrings=astring.split(".")
    mainstring=""
    if len(newstrings)==1:
        return (astring,"unknown")

    mainstring=mainstring+".".join(newstrings[:-1])
    #for i in range(len(newstrings)-1):
    #    mainstring=mainstring+newstrings[i]

    return (mainstring,newstrings[-1])


@app.before_first_request
def _setup():
    app.basedir = os.path.abspath(app.config['SLIDE_DIR'])
    config_map = {
        'DEEPZOOM_TILE_SIZE': 'tile_size',
        'DEEPZOOM_OVERLAP': 'overlap',
        'DEEPZOOM_LIMIT_BOUNDS': 'limit_bounds',
    }
    opts = {v: app.config[k] for k, v in config_map.items()}
    #for now I want 2 slides there could be more, or less
    for i in range(2):
        slide=_SlideCache(app.config['SLIDE_CACHE_SIZE'], opts)
        slides_context["slide_names"].append( "" )
        slides_context["slide_formats"].append( "" )
        slides_context["slides"].append( slide )


def _get_slide(path, i=None, name=None):
    path = os.path.abspath(os.path.join(app.basedir, path))
    abort_flag=True
    inname=name
    inpath=path
    if not path.startswith(app.basedir + os.path.sep):
        # Directory traversal
        abort(404)
    if (not os.path.exists(path)):
        for i in range(len(slides_context["slide_formats"])):
            if os.path.exists(path+"."+slides_context['slide_formats'][i]):
                abort_flag=False
                inname=name+"."+slides_context['slide_formats'][i]
                inpath=path+"."+slides_context['slide_formats'][i]
                continue
        if abort_flag:
            abort(404)            
    try:
        if (i is not None) and (i<=len(slides_context["slides"])):
            acache=slides_context["slides"][i]
            slide = acache.get(inpath)
            info=_removeFormat(inpath)
            slides_context["slide_names"][i]=info[0]
            slides_context["slide_formats"][i]=info[1]
            return slide
        elif inname is not None:
            for n in range(len(slides_context["slides"])):
                if inname in slides_context["slide_names"][n]:
                    acache=slides_context["slides"][n]
                    slide = acache.get(inpath)
                    return slide

    except OpenSlideError:
        abort(404)


@app.after_request
def after_request(response):
  response.headers['Access-Control-Allow-Methods']='*'
  response.headers['Access-Control-Allow-Origin']='*'
  response.headers['Vary']='Origin'
  return response



@app.route('/')
def index():
    return render_template('files.html', root_dir=_Directory(app.basedir))


@app.route('/<pathscombined>')
def slide(pathscombined):
    
    if not "**" in pathscombined:
        abort(404)

    paths=pathscombined.split("**")

    path1=paths[0]
    path2=paths[1]

    path1=path1.replace("*","/")
    path2=path2.replace("*","/")

    path1=os.path.normpath(path1)
    path2=os.path.normpath(path2)

    slide1 = _get_slide(path1,0)
    slide2 = _get_slide(path2,1)
    slide_url1 = url_for('dzi', path=_removeFormat(path1)[0])
    slide_url2 = url_for('dzi', path=_removeFormat(path2)[0])

    return render_template(
        'viewer.html',
        slide_url1=slide_url1,
        slide_url2=slide_url2,
        slide_filename1=slides_context["slide_names"][0],
        slide_mpp1=slide1.mpp,
        slide_filename2=slides_context["slide_names"][1],
        slide_mpp2=slide2.mpp,
    )


@app.route('/<path:path>.dzi')
def dzi(path):
    slide = _get_slide(path,name=str(path))
    format = app.config['DEEPZOOM_FORMAT']
    resp = make_response(slide.get_dzi(format))
    resp.mimetype = 'application/xml'
    return resp


@app.route('/<path:path>_files/<int:level>/<int:col>_<int:row>.<format>')
def tile(path, level, col, row, format):
    slide = _get_slide(path,name=str(path))
    format = format.lower()
    if format != 'jpeg' and format != 'png':
        # Not supported by Deep Zoom
        abort(404)
    try:
        tile = slide.get_tile(level, (col, row))
    except ValueError:
        # Invalid level or coordinates
        abort(404)
    buf = BytesIO()
    tile.save(buf, format, quality=app.config['DEEPZOOM_TILE_QUALITY'])
    resp = make_response(buf.getvalue())
    resp.mimetype = 'image/%s' % format
    return resp


if __name__ == '__main__':
    parser = OptionParser(usage='Usage: %prog [options] [slide-directory]')
    parser.add_option(
        '-B',
        '--ignore-bounds',
        dest='DEEPZOOM_LIMIT_BOUNDS',
        default=True,
        action='store_false',
        help='display entire scan area',
    )
    parser.add_option(
        '-c', '--config', metavar='FILE', dest='config', help='config file'
    )
    parser.add_option(
        '-d',
        '--debug',
        dest='DEBUG',
        action='store_true',
        help='run in debugging mode (insecure)',
    )
    parser.add_option(
        '-e',
        '--overlap',
        metavar='PIXELS',
        dest='DEEPZOOM_OVERLAP',
        type='int',
        help='overlap of adjacent tiles [1]',
    )
    parser.add_option(
        '-f',
        '--format',
        metavar='{jpeg|png}',
        dest='DEEPZOOM_FORMAT',
        help='image format for tiles [jpeg]',
    )
    parser.add_option(
        '-l',
        '--listen',
        metavar='ADDRESS',
        dest='host',
        default='127.0.0.1',
        help='address to listen on [127.0.0.1]',
    )
    parser.add_option(
        '-p',
        '--port',
        metavar='PORT',
        dest='port',
        type='int',
        default=5000,
        help='port to listen on [5000]',
    )
    parser.add_option(
        '-Q',
        '--quality',
        metavar='QUALITY',
        dest='DEEPZOOM_TILE_QUALITY',
        type='int',
        help='JPEG compression quality [75]',
    )
    parser.add_option(
        '-s',
        '--size',
        metavar='PIXELS',
        dest='DEEPZOOM_TILE_SIZE',
        type='int',
        help='tile size [254]',
    )

    (opts, args) = parser.parse_args()
    # Load config file if specified
    if opts.config is not None:
        app.config.from_pyfile(opts.config)
    # Overwrite only those settings specified on the command line
    for k in dir(opts):
        if not k.startswith('_') and getattr(opts, k) is None:
            delattr(opts, k)
    app.config.from_object(opts)
    # Set slide directory
    try:
        app.config['SLIDE_DIR'] = args[0]
    except IndexError:
        pass

    app.run(host=opts.host, port=opts.port, threaded=True)
