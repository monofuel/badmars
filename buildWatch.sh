#!/bin/bash

# triggers multiple events and doesn't seem to list the filename?'
inotifywait -m --format '%w%f' server/nodejs | while read line
do
    echo "something happened on path $line"
    # TODO babel needs to build the updated file and put it into the
    # bin/server/nodejs directory in the right folder.
done