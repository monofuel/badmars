export BADMARS_DB='localhost'
export AI_HOST='localhost'
export MAP_HOST='localhost'
export BADMARS_WS_SERVER='ws://localhost'

echo > log.txt
node web.js | tee log.txt &
sleep 5s
node chunk.js | tee log.txt &
sleep 5s
node net.js | tee log.txt &
sleep 5s
node ai.js | tee log.txt &
sleep 5s
node pathfinder.js | tee log.txt &
node simulate.js | tee log.txt


