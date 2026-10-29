"""Local-only, targeted removal of 14 burned-in subtitle periods (FFmpeg).

Usage: python references/revisions/20261029-video-periods.py --ffmpeg PATH
Outputs reviewed candidates under .tmp; does not overwrite public assets.
Original audio is stream-copied. No subtitle reflow, timing or narration edits.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / '.tmp/promo-subtitle-20261029'
# Dot bounding boxes at 1920x1080, plus inclusive active frame ranges at 24 fps.
SPECS = {
    'kor': [(1292,980,12,12,52,127), (1364,973,10,11,138,221),
            (1255,1018,9,8,223,353), (1461,1017,9,8,357,525),
            (1389,973,10,11,534,610), (1130,973,10,11,619,663),
            (1288,973,10,11,666,738)],
    'eng': [(1467,971,11,12,52,127), (1388,966,10,10,151,227),
            (1392,1009,9,8,232,373), (1403,1009,9,8,378,527),
            (1444,966,10,10,534,610), (1124,966,10,10,619,663),
            (1363,966,10,10,666,736)],
}

def main():
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument('--ffmpeg', required=True)
    args = parser.parse_args()
    WORK.mkdir(parents=True, exist_ok=True)

    def run(extra):
        return subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error',
                               *extra], check=True, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, encoding='utf-8').stdout

    report = {}
    for lang, specs in SPECS.items():
        source = ROOT / f'assets/videos/initgroup-promo_{lang}.mp4'
        original = WORK / f'original-{lang}.mp4'
        if not original.exists():
            shutil.copyfile(source, original)
        filters = []
        regions = []
        for x,y,w,h,start,end in specs:
            # Include anti-aliasing, shadow and YUV chroma edges. Adjacent letters
            # and commas are outside these individually inspected rectangles.
            left,top = (x-3)//2*2, (y-3)//2*2
            right,bottom = (x+w+7+1)//2*2, (y+h+7+1)//2*2
            rect = [left,top,right-left,bottom-top,start,end]
            regions.append(rect)
            filters.append(f'delogo=x={left}:y={top}:w={right-left}:h={bottom-top}'
                           f":enable='between(n,{start},{end})'")
        output = WORK / f'edited-{lang}.mp4'
        print(f'Rendering {lang}: 7 small period regions; original audio copied', flush=True)
        run(['-i',str(original),'-map','0:v:0','-map','0:a:0','-map_metadata','0',
             '-vf',','.join(filters),'-c:v','libx264','-preset','slow','-crf','16',
             '-pix_fmt','yuv420p','-threads','4','-c:a','copy',
             '-movflags','+faststart','-y',str(output)])
        audio_args = ['-map','0:a:0','-c:a','copy','-f','hash','-hash','sha256','-']
        original_audio = run(['-i',str(original),*audio_args]).strip()
        edited_audio = run(['-i',str(output),*audio_args]).strip()
        assert original_audio == edited_audio, 'Audio changed'
        run(['-i',str(output),'-f','null','-'])
        report[lang] = {'originalSHA256':hashlib.sha256(original.read_bytes()).hexdigest(),
                        'editedSHA256':hashlib.sha256(output.read_bytes()).hexdigest(),
                        'audioStreamSHA256':edited_audio,'audioBitExact':True,
                        'periodsRemoved':7,'regionsXYWHStartEndFrame':regions,
                        'method':'FFmpeg delogo local background interpolation; H264 CRF16',
                        'videoReencoded':True,'decodePassed':True}
        (WORK/'verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
        print(f'PASS {lang}: audio bit-exact, full decode passed',flush=True)

if __name__ == '__main__':
    main()
