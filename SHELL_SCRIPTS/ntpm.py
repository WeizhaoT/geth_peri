from datetime import datetime
from time import ctime
from os.path import join, exists

import os
import sys
import json
import time
import ntplib
import shutil
import argparse
import schedule
import threading


global CLIENT,  CD, CT, LOGDIR, MAXENTRY, PREFIX, LOCK

CLIENT = ntplib.NTPClient()
PREFIX = 'ntplog_'


class Cooldown:
    def __init__(self, max_cd):
        self.cd = 0
        self.max_cd = max_cd - 1

    def heat(self):
        self.cd = self.max_cd

    def cooled(self):
        return self.cd == 0

    def cooling(self):
        return 0 < self.cd < self.max_cd

    def countdown(self):
        self.cd -= 1


class RecordCounter:
    def __init__(self, max_entry):
        self.num_entry = 0
        self.filename = None
        self.max_entry = max_entry

    def incr(self):
        self.num_entry += 1
        if self.num_entry == self.max_entry:
            self.num_entry = 0

    def isZero(self):
        return self.num_entry == 0

    def getFilename(self):
        return self.filename

    def updateFilename(self, filename):
        self.filename = filename


def ntp_query(ip, logdir):
    ct = CT[ip]
    cd = CD[ip]
    lock = LOCK[ip]
    now = datetime.now()
    with lock:
        if cd.cooled():
            try:
                response = CLIENT.request(ip, version=3)
                if ct.isZero():
                    now_filename = now.date().isoformat() + "_" + \
                        "{:02d}.{:02d}.{:02d}".format(now.hour,
                                                      now.minute, now.second)
                    ct.updateFilename(PREFIX + now_filename + '.jsonl')
                    # print(json.dumps({now.isoformat(): response.offset}))

                with open(join(logdir, ct.getFilename()), mode='a') as f:
                    f.write(json.dumps(
                        {now.isoformat(): response.offset * 1000}) + "\n")

                ct.incr()
            except Exception as error:
                print('{} Error:\n{}'.format(now, error))
                cd.heat()
        else:
            print('{} Cooling'.format(now))
            cd.countdown()


def main(server_ip, period, max_cd, max_log, logdir, prefix):
    global CD, CT, MAXENTRY, LOGDIR, LOCK
    CD = {}
    CT = {}
    LOCK = {}
    MAXENTRY = max_log
    LOGDIR = logdir

    cache_path = join(logdir, 'ntpcache')
    if exists(cache_path):
        shutil.rmtree(cache_path)

    os.makedirs(cache_path)

    for i, ip in enumerate(server_ip):
        CT[ip] = RecordCounter(max_log)
        CD[ip] = Cooldown(max_cd)
        LOCK[ip] = threading.Lock()
        logsubdir = join(logdir, f'{prefix}{i+1}')
        if exists(logsubdir):
            shutil.move(logsubdir, cache_path)

        os.makedirs(logsubdir)
        print(f'NTP queries started with {ip}')
        schedule.every(period).seconds.do(ntp_query, ip, logsubdir)

    while 1:
        schedule.run_pending()
        time.sleep(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-i', '--ip', type=str, nargs='+', required=True)
    parser.add_argument('-T', '--period', type=int, default=12, required=False)
    parser.add_argument('-c', '--cd', type=int, default=5, required=False)
    parser.add_argument('-m', '--maxlog', type=int,
                        default=4000, required=False)
    parser.add_argument('-l', '--logpath', type=str,
                        default='/data/logs/', required=False)
    parser.add_argument('-p', '--prefix', type=str,
                        default='ntp', required=False)

    args = parser.parse_args(sys.argv[1:])

    main(args.ip, args.period, args.cd, args.maxlog, args.logpath, args.prefix)
