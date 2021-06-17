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
  //  MezeLearner
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
    run(theta, row, col) {
      const episode = 5000;
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
  //  MazeRenderer
  ///////////////////////////////////////////////////////////////////////////////////////////////
  class MazeRenderer {
    constructor(canvas) {
      this.ctx = canvas.getContext("2d");
      this.WALL_SIZE = 10;
    }

    // Pathを迷路に描画
    render_path(s_a_history, _col) {
      this.ctx.fillStyle = "green";
      console.log(s_a_history);
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
      canvas.height = data.length * this.WALL_SIZE;
      canvas.width = data[0].length * this.WALL_SIZE;
      for (let row = 0; row < data.length; row++) {
        for (let col = 0; col < data[0].length; col++) {
          if (data[row][col] === 1) {
            this.ctx.fillRect(
              col * this.WALL_SIZE,
              row * this.WALL_SIZE,
              this.WALL_SIZE,
              this.WALL_SIZE
            );
          }
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
    constructor(row, col, learner, renderer) {
      if (row < 5 || col < 5 || row % 2 === 0 || col % 2 === 0) {
        alert("Size not valid!");
        return;
      }
      this.learner = learner; // 学習用クラス
      this.s_a_history = [];
      this.renderer = renderer; // 描画用クラス
      this.row = Number(row);
      this.col = Number(col);

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
      console.log("🚀 ~ file: main.js ~ line 74 ~ Maze ~ getData ~ data", data);

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

    // MazeLearner内のlearnを呼び出す
    learn() {
      this.s_a_history = this.learner.run(this.theta, this.row, this.col);
    }

    // MazeRenderer内のrenderを呼び出す
    render() {
      this.renderer.render(this.data, this.s_a_history, this.col);
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  //  MAIN
  ///////////////////////////////////////////////////////////////////////////////////////////////

  const maze = new Maze(7, 7, new MezeLearner(), new MazeRenderer(canvas));
  //maze.learn();
  maze.render();

  document.getElementById("btn").onclick = function () {
    const ROW = document.getElementById("row-size").value;
    const COL = document.getElementById("col-size").value;
    // Validation
    const maze = new Maze(
      ROW,
      COL,
      new MezeLearner(),
      new MazeRenderer(canvas)
    );
    maze.learn();
    maze.render();

    console.log(maze);
    const result = maze.s_a_history.length + " steps";
    document.getElementById("result").innerHTML = result;

    let progress = "";
    for (let p of maze.s_a_history) {
      console.log(p);
      progress = progress + "→" + p[0];
    }
    document.getElementById("progress").innerHTML = progress;
  };
})();
