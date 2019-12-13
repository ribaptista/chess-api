import uci from 'node-uci';
import Koa from 'koa';
import Router from '@koa/router';
import mount from 'koa-mount';
import cors from '@koa/cors';
import chess from 'chess.js'

const randomWhite = false;
const enginePath = './bin/komodo-10-linux';

(async () => {
  const engine = await initUCI();
  const app = new Koa();
  const router = new Router();
  router.get('/move', async (ctx, next) => {
    const history = ctx.query.h ? ctx.query.h.split(',') : [];
    const game = new chess.Chess();
    history.forEach(move => game.move(move, {sloppy: true}));
    let move;
    if (randomWhite && game.turn() == 'w') {
      const moves = game.moves({ verbose: true });
      const random = moves[Math.floor(Math.random() * moves.length)];
      move = random.from + random.to;
    } else {
      move = await calcNextMove(engine, history);
    }
    game.move(move, {sloppy: true});
    ctx.body = {
      move,
      fen: game.fen(),
      checkmate: game.in_checkmate(),
    }
    return next();
  });
  app
    .use(mount('/api', router.routes()))
    .use(router.allowedMethods())
    .use(cors());
  app.listen(3000);
})();

async function initUCI() {
  const engine = new uci.Engine(enginePath);
  await engine.init();
  await engine.setoption('MultiPV', '4');
  await engine.isready();
  return engine;
}

async function calcNextMove(engine, history) {
  await engine.ucinewgame();
  await engine.position('startpos', history);
  const result = await engine.go({});
  return result.bestmove;
}
