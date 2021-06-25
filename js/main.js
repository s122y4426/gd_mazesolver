"use strict";

(() => {
  //配列同士の比較用関数
  // https://www.delftstack.com/ja/howto/javascript/compare-two-arrays-javascript/
  Array.prototype.equals = function (getArray) {
    if (this.length != getArray.length) return false;

    for (var i = 0; i < getArray.length; i++) {
      if (this[i] instanceof Array && getArray[i] instanceof Array) {
        if (!this[i].equals(getArray[i])) return false;
      } else if (this[i] != getArray[i]) {
        return false;
      }
    }
    return true;
  };

  ///////////////////////////////////////////////////////////////////////////////////////////////
  //  MezeLearner (Gradient Descent)
  ///////////////////////////////////////////////////////////////////////////////////////////////
  class MezeLearner {
    constructor() {}

    // 方策決定関数get_piで使用
    get_exp_sum(_list) {
      return _list
        .filter((n) => n != 0) // 0を除外
        .reduce((a, v) => {
          return a + Math.exp(v); // 0以外の要素を指数倍して合計
        }, 0);
    }

    // パラメーターから方策を決定
    get_pi(theta) {
      let new_theta = [];
      // 行列の各行を取り出す
      for (let element of theta) {
        let row = [];
        // 各要素に対してソフトマックス関数を適用
        for (let e of element) {
          e === 0
            ? row.push(0)
            : row.push(Math.exp(e) / this.get_exp_sum(element));
        }
        new_theta.push(row);
      }
      return new_theta;
    }

    // 方策から行動決定
    //参考：https://www.namakedame.work/js-randomized-algorithm/
    get_a(theta, s) {
      const totalWeight = theta[s].reduce((a, v) => a + v);
      let searchPosition = 0.0;
      const pickedAction = Math.random() * totalWeight;

      for (const [index, action] of theta[s].entries()) {
        searchPosition += Number(action);
        if (pickedAction < searchPosition) {
          return index;
        }
      }
    }

    //アクションに応じて次の行動を選択
    get_s_next(s, a, col) {
      switch (a) {
        case 0:
          return s - (col - 2);
        case 1:
          return s + 1;
        case 2:
          return s + (col - 2);
        case 3:
          return s - 1;
      }
    }

    //メイン関数
    play(pi, row, col) {
      let s = 0;
      const s_a_history = [[0, ""]];

      let i = 0;
      while (true) {
        //方策から行動を選択
        let a = this.get_a(pi, s);
        //console.log("a: ", a);

        //行動から次の状態を取得
        let s_next = this.get_s_next(s, a, col);
        //console.log("s_next: ", s_next);

        //履歴の更新
        s_a_history[s_a_history.length - 1][1] = a;
        s_a_history.push([s_next, ""]);

        // Goalポジションは右端で固定
        let goal_pos = (row - 2) * (col - 2) - 1;
        if (s_next === goal_pos) {
          break;
        } else {
          s = s_next;
        }
      }
      return s_a_history;
    }

    //結果に応じてパラメータθの更新
    update_theta(theta, pi, s_a_history) {
      const eta = 0.1; //学習係数
      let total = s_a_history.length - 1; //ゴールまでの総ステップ数
      let s_count = theta.length;
      let a_count = theta[0].length;
      console.log(s_count, a_count);

      // 変化量の計算
      for (let i = 0; i < s_count; i++) {
        for (let j = 0; j < a_count; j++) {
          if (theta[i][j] != 0) {
            //ある状態で特定の行動をとった回数
            let a_in_s = [];
            for (let s_a of s_a_history) {
              if (s_a.equals([i, j])) {
                a_in_s.push(s_a);
              }
            }
            let n_sa = a_in_s.length;

            //ある状態の行動総数（何回その状態になったか）
            let all_in_s = [];
            for (let s_a of s_a_history) {
              if (s_a[0] === i) {
                all_in_s.push(s_a);
              }
            }
            let n_s = all_in_s.length;

            //パタラメーターの更新
            theta[i][j] += eta * ((n_sa - pi[i][j] * n_s) / total);
          }
        }
      }
      return theta;
    }

    delta_sum_abs(_list1, _list2) {
      let r = _list1.length;
      let c = _list1[0].length;
      let delta_sum = 0;
      for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
          delta_sum += Math.abs(_list1[i][j] - _list2[i][j]);
        }
      }
      return delta_sum;
    }

    //エピソード回数分、学習
    run(theta, row, col, algo, episodes) {
      const episode = episodes;
      let s_a_history = [];
      let pi_new = [];
      let pi_delta = 0;
      const stop_epsilon = Math.pow(10, -4); // しきい値
      //const theta = theta_0; // パラメータθ
      let pi = this.get_pi(theta); // 方策
      for (let i = 0; i < episode; i++) {
        //1エピソード実行して履歴取得
        s_a_history = this.play(pi, row, col);
        //パラメータθの更新
        theta = this.update_theta(theta, pi, s_a_history);
        //方策の更新
        pi_new = this.get_pi(theta);
        //方策の変化量
        pi_delta = pi_delta = this.delta_sum_abs(pi_new, pi);
        pi = JSON.parse(JSON.stringify(pi_new)); //配列のコピー（値渡し）

        // 結果出力
        console.log(
          "エピソード: ",
          i + 1,
          " 総ステップ数: ",
          s_a_history.length,
          " 方策変化量: ",
          pi_delta
        );

        if (pi_delta < stop_epsilon) {
          console.log("☆学習完了☆");
          console.log(s_a_history);
          break;
        }
      }
      return s_a_history;
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  //  MezeLearner (Q-learning and Sarsa)
  ///////////////////////////////////////////////////////////////////////////////////////////////
  class Sarsa {
    constructor() {}

    // 方策決定関数get_piで使用
    get_sum(_list) {
      return _list.reduce((a, v) => a + v); // 0以外の要素合計
    }

    // パラメーターから方策を決定
    get_pi(theta) {
      let pi = [];
      // 行列の各行を取り出す
      for (let element of theta) {
        let row = [];
        // 各要素に対し割合を算出
        for (let e of element) {
          e === 0 ? row.push(0) : row.push(e / this.get_sum(element));
        }
        pi.push(row);
      }
      return pi;
    }

    // Qテーブルの作成
    get_Q(theta) {
      let Q = JSON.parse(JSON.stringify(theta)); //配列のコピー（値渡し）
      let r = theta.length;
      let c = theta[0].length;
      for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
          Q[i][j] = theta[i][j] * Math.random(); // ランダム値で初期化（0以外）
        }
      }
      return Q;
    }

    //アクションに応じて次の行動を選択
    get_s_next(s, a, col) {
      switch (a) {
        case 0:
          return s - (col - 2);
        case 1:
          return s + 1;
        case 2:
          return s + (col - 2);
        case 3:
          return s - 1;
      }
    }

    // 方策から行動決定
    //参考：https://www.namakedame.work/js-randomized-algorithm/
    get_random_a(pi, s) {
      console.log("random selected");
      console.log("pi: ", pi);
      const totalWeight = pi[s].reduce((a, v) => a + v);
      console.log(" totalWeight:", totalWeight);
      let searchPosition = 0.0;
      const pickedAction = Math.random() * totalWeight;

      for (const [index, action] of pi[s].entries()) {
        searchPosition += Number(action);
        if (pickedAction < searchPosition) {
          return index;
        }
      }
    }

    // 配列内の最大値を返す
    return_max(Q, s) {
      return Q[s].reduce((a, b) => (a > b ? a : b));
    }

    // 配列内の最大値を検索し、そのインデックスを返す
    return_max_index(Q, s) {
      console.log("maxQ selected");
      console.log(s, Q);
      let max = Q[s].reduce((a, b) => (a > b ? a : b));
      return Q[s].indexOf(max);
    }

    // ε-greedy法
    get_a(s, Q, epsilon, pi) {
      return Math.random() < epsilon
        ? this.get_random_a(pi, s)
        : this.return_max_index(Q, s);
    }

    // Q値の更新
    learning(algo, s, a, r, goal_pos, s_next, a_next, Q) {
      const eta = 0.1;
      const gamma = 0.9;

      switch (algo) {
        case "qlearning":
          s_next === goal_pos
            ? (Q[s][a] = Q[s][a] + eta * (r - Q[s][a]))
            : (Q[s][a] =
                Q[s][a] +
                eta * (r + gamma * this.return_max(Q, s_next)) -
                Q[s][a]);
          return Q;
        case "sarsa":
          console.log("state: ", s, "action: ", a);
          console.log(Q[s][a]);
          s_next === goal_pos
            ? (Q[s][a] = Q[s][a] + eta * (r - Q[s][a]))
            : (Q[s][a] =
                Q[s][a] + eta * (r + gamma * Q[s_next][a_next] - Q[s][a]));
          return Q;
      }
    }

    // 1エピソードの実行
    play(Q, epsilon, pi, row, col, algo) {
      let s = 0;
      let r = 0;
      let a;
      let a_next = this.get_a(s, Q, epsilon, pi);
      let s_next;
      const s_a_history = [[0, ""]];
      const goal_pos = (row - 2) * (col - 2) - 1;
      console.log("play!!!!!!!!!!!!!!!!!!!!!!!");
      console.log(
        "###########################################################################################"
      );
      while (true) {
        a = a_next;
        // 行動から次の状態を取得

        console.log("s:", s, "a:", a);
        s_next = this.get_s_next(s, a, col);
        console.log("s_next", s_next);

        //履歴の更新
        s_a_history[s_a_history.length - 1][1] = a;
        s_a_history.push([s_next, ""]);

        // Q値更新準備（状態価値関数V）
        if (s_next === goal_pos) {
          r = 1;
          a_next = "";
        } else {
          r = 0;
          console.log("☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆");
          console.log("s_next", s_next);
          a_next = this.get_a(s_next, Q, epsilon, pi);
          console.log("a_next", a_next);
          console.log("☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆");
        }
        // Q値更新
        Q = this.learning(algo, s, a, r, goal_pos, s_next, a_next, Q);
        console.log(Q);

        // 修了判定

        if (s_next === goal_pos) {
          break;
        } else {
          s = s_next;
        }
        console.log(s_a_history);
        console.log("----------------");
      }
      return [s_a_history, Q];
    }

    run(theta, row, col, algo, episodes) {
      // MAIN処理開始
      let epsilon = 0.5;
      const episode = episodes;
      let Q = this.get_Q(theta);
      let pi = this.get_pi(theta);
      let s_a_history;

      for (let i = 0; i < episode; i++) {
        document.getElementById("notice").innerHTML = "ooooooooooooo";
        // ε-greedyの値を少しずつ小さく
        epsilon = epsilon / 2;

        // 1エピソード実行して履歴と行動価値観数を取得
        [s_a_history, Q] = this.play(Q, epsilon, pi, row, col, algo);
        //console.table(Q);

        // 結果
        console.log(i, s_a_history);
        console.log("====================================================");
      }
      return s_a_history;
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  //  MazeRenderer
  ///////////////////////////////////////////////////////////////////////////////////////////////
  class MazeRenderer {
    constructor(canvas) {
      this.ctx = canvas.getContext("2d");
      this.WALL_SIZE = 30;
    }

    // Pathを迷路に描画
    render_path(s_a_history, _col) {
      this.ctx.fillStyle = "green";
      this.ctx.globalAlpha = 0.4;
      for (let s_a of s_a_history) {
        let y = Math.floor(s_a[0] / (_col - 2)); //縦方向y
        let x = s_a[0] - y * (_col - 2); //横方向x
        this.ctx.fillRect(
          (x + 1) * this.WALL_SIZE, //横x
          (y + 1) * this.WALL_SIZE, //縦y
          this.WALL_SIZE,
          this.WALL_SIZE
        );
      }
    }

    // 迷路の描画
    render(data, s_a_history, _col) {
      console.log(data);
      canvas.height = data.length * this.WALL_SIZE;
      canvas.width = data[0].length * this.WALL_SIZE;
      for (let row = 0; row < data.length; row++) {
        for (let col = 0; col < data[0].length; col++) {
          // 壁の描画
          if (data[row][col] === 1) {
            this.ctx.fillStyle = "black";
            this.ctx.fillRect(
              col * this.WALL_SIZE,
              row * this.WALL_SIZE,
              this.WALL_SIZE,
              this.WALL_SIZE
            );
          }
        }
      }
      // Step番号付与
      for (let row = 0; row < data.length - 2; row++) {
        for (let col = 0; col < data[0].length - 2; col++) {
          this.ctx.fillStyle = "red";
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          this.ctx.globalCompositeOperation = "lighter";
          this.ctx.fillText(
            row * (data[0].length - 2) + col,
            (col + 1) * this.WALL_SIZE + this.WALL_SIZE / 2,
            (row + 1) * this.WALL_SIZE + this.WALL_SIZE / 2
          );
        }
      }
      // アニメーションの描画
      this.render_path(s_a_history, _col);
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  //  MAZE
  ///////////////////////////////////////////////////////////////////////////////////////////////
  class Maze {
    constructor(row, col, algo, episodes, learner, renderer) {
      if (
        row < 5 ||
        col < 5 ||
        row > 13 ||
        col > 13 ||
        row % 2 === 0 ||
        col % 2 === 0
      ) {
        alert("Size not valid!");
        return;
      }
      this.learner = learner; // 学習用クラス
      this.s_a_history = [];
      this.renderer = renderer; // 描画用クラス
      this.row = Number(row);
      this.col = Number(col);
      this.algo = algo;
      this.episodes = Number(episodes);

      //this.data = this.getData();
      [this.data, this.theta] = this.getData();
    }

    getData() {
      const data = [];

      // マップ下地の作成
      for (let row = 0; row < this.row; row++) {
        data[row] = [];
        for (let col = 0; col < this.col; col++) {
          data[row][col] = 1;
        }
      }

      // 外壁の作成
      for (let row = 1; row < this.row - 1; row++) {
        for (let col = 1; col < this.col - 1; col++) {
          data[row][col] = 0;
        }
      }

      // 棒の作成
      for (let row = 2; row < this.row - 2; row += 2) {
        for (let col = 2; col < this.col - 1; col += 2) {
          data[row][col] = 1;
        }
      }

      // 倒す向きの決定
      for (let row = 2; row < this.row - 2; row += 2) {
        for (let col = 2; col < this.col - 1; col += 2) {
          let destRow;
          let destCol;

          do {
            const dir =
              row === 2
                ? Math.floor(Math.random() * 4)
                : Math.floor(Math.random() * 3) + 1;
            switch (dir) {
              case 0: //up
                destRow = row - 1;
                destCol = col;
                break;
              case 1: //down
                destRow = row + 1;
                destCol = col;
                break;
              case 2: //left
                destRow = row;
                destCol = col - 1;
                break;
              case 3: //right
                destRow = row;
                destCol = col + 1;
                break;
            }
          } while (data[destRow][destCol] === 1);

          data[destRow][destCol] = 1;
        }
      }
      console.log("🚀 迷路データ配列", data);

      // パラメーターの自動作成
      const theta = [];
      for (let row = 1; row < this.row - 1; row++) {
        for (let col = 1; col < this.col - 1; col++) {
          if (data[row][col] != 1) {
            let state = [];
            data[row - 1][col] === 1 ? state.push(0) : state.push(1); //上（↑）
            data[row][col + 1] === 1 ? state.push(0) : state.push(1); //右（→）
            data[row + 1][col] === 1 ? state.push(0) : state.push(1); //下（↓）
            data[row][col - 1] === 1 ? state.push(0) : state.push(1); //左（←）
            theta.push(state);
          } else {
            theta.push([0, 0, 0, 0]);
          }
        }
      }
      console.log(theta);

      //return data;
      return [data, theta]; //[迷路データ, theta初期値]
    }

    // 選択アルゴリズムのlearnを呼び出す
    learn() {
      this.s_a_history = this.learner.run(
        this.theta,
        this.row,
        this.col,
        this.algo,
        this.episodes
      );
    }

    // MazeRenderer内のrenderを呼び出す
    render() {
      this.renderer.render(this.data, this.s_a_history, this.col);
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  //  MAIN
  ///////////////////////////////////////////////////////////////////////////////////////////////

  const canvas = document.querySelector("canvas");
  let maze;
  maze = new Maze(
    7,
    7,
    "gd",
    5000,
    new MezeLearner(),
    new MazeRenderer(canvas)
  );
  //maze.learn();
  maze.render();

  // フォームからユーザー入力パラメーター情報を取得
  document.getElementById("btn").onclick = function () {
    const ROW = document.getElementById("row-size").value;
    const COL = document.getElementById("col-size").value;
    const ALGO = document.getElementById("algorithm").value;
    const EPISODES = document.getElementById("episodes").value;

    // Validation
    console.log(ALGO);
    switch (ALGO) {
      case "gd":
        maze = new Maze(
          ROW,
          COL,
          ALGO,
          EPISODES,
          new MezeLearner(),
          new MazeRenderer(canvas)
        );
        break;
      case "qlearning":
        maze = new Maze(
          ROW,
          COL,
          ALGO,
          EPISODES,
          new Sarsa(),
          new MazeRenderer(canvas)
        );
        break;
      case "sarsa":
        maze = new Maze(
          ROW,
          COL,
          ALGO,
          EPISODES,
          new Sarsa(),
          new MazeRenderer(canvas)
        );
        break;
    }

    maze.learn();
    maze.render();

    console.log(maze);
    const result = maze.s_a_history.length + " steps";
    document.getElementById("result").innerHTML = result;

    let progress = "";
    let steps = [];
    for (let p of maze.s_a_history) {
      console.log(p);
      progress = progress + "→" + p[0];
      steps.push(p[0]);
    }
    document.getElementById("progress").innerHTML = progress;

    /** 配列内で値が重複してないか調べる **/
    function existsSameValue(a) {
      var s = new Set(a);
      return s.size === a.length;
    }
    if (existsSameValue(steps)) {
      document.getElementById("message").innerHTML = "SUCCESS!!!";
    } else {
      document.getElementById("message").innerHTML = "FAILED";
    }
  };
})();
