#!/bin/bash

inotifywait -m -e modify --format '%w%f' server/nodejs | while read line
do
    echo "something happened on path $line"
done