const fs = require('fs');
const readline = require('readline');

let nfaArray = [];  //存储nfa
let dfaArray = [];  //存储dfa

let tokens = [];    //记录所有单词
let errlist = [];   //记录所有错误单词
let errorInfo = []; //记录错误信息
let num = 0;          // nfa/dfa个数

class State {
    constructor(name) {
        this.name = name;
        this.transitions = {}; // 在JavaScript中，对象的键值对是通过哈希表来实现的,因此不用遍历查找
    }
    // 添加转移情况
    addTransition(inputSymbol, nextState) {
        // 如果transitions中不存在以input为键的数组，则创建一个空数组
        if (!this.transitions[inputSymbol]) {
            this.transitions[inputSymbol] = [];
        }
        // 将nextState添加到以input为键的数组中
        this.transitions[inputSymbol].push(nextState);
    }
}
// 定义 DFAState 类
class DFAState {
    static counter = 1;  // 静态计数器，用于生成状态名称

    constructor(nfaStateSet) {
        this.name = DFAState.counter++;  // 状态名称，每次按序递增
        this.nfaStateSet = nfaStateSet;  // 包含的 NFA 状态集合
        this.transitions = {};  // 转移情况映射表，键为输入符号，值为下一个状态名称
    }

    // 添加转移情况
    addTransition(inputSymbol, nextStateName) {
        this.transitions[inputSymbol] = nextStateName;
    }

    // 查询特定输入符号下的下一个状态名称
    getNextState(inputSymbol) {
        return this.transitions[inputSymbol] || null;
    }
    //重置状态名称
    static resetCounter() {
        DFAState.counter = 1;
    }
}

class NFA {
    //构造函数
    constructor() {
        this.startState = {};        //初始状态
        this.finalState = new State("<final>"); //添加一个终止状态,此正规文法转nfa的算法中，构成的NFA只有一个终态
        this.states = new Set();     //状态集
        this.inputChars = new Set(); //输入符号集，非终结符
    }
    //通过状态名获取状态对象
    getStatebyName(stateName) {
        for (const state of this.states) {
            if (state.name === stateName) {
                return state;
            }
        }
        return null; // 如果没有找到匹配的状态，则返回 null
    }
    //逐行产生式生成NFA
    generateNFA(grammarline, flag) {
        const [stateName, processes] = grammarline.split("->");//stateName--产生式左部;processes--产生式右部
        const processesArray = processes.split("|"); //processesArray--产生式右部用|分隔的数组
        let currentState = {};
        //如果是文法第一行
        if (flag) {
            //创建初始状态对象并加入状态集
            currentState = new State(stateName);
            this.states.add(currentState);
            this.startState = currentState;
            this.states.add(this.finalState);//把添加的终止状态放入状态集
            // console.log("开始状态:"+currentState);
        }
        //如果不是文法第一行
        else {
            currentState = this.getStatebyName(stateName);// 获取当前状态
        }
        //console.log(currentState)
        //处理右部
        processesArray.forEach((process) => {
            const input = process[0]; //input表示正规文法产生式右部的非终结符，，，左线性
            //我的文法中用L和D表示26個字母(大小写）和10個数字，为了方便，虽然是大写·，但是表示非終結符
            if (input == "L" || input === "D") {
                //console.log(input)
                this.solveLD(currentState, process, input);  //输入文法中含有表示所有字母或数字的单独处理，因为写成正规文法太长了
            }
            else {
                this.solveRight(currentState, process, input);
            }
        })
    }

    //处理含有 表示所有字母或数字的非终结符 的文法右部
    solveLD(currentState, process, input) {
        //如果文法右部含非终结符L表示字母
        if (input == "L") {
            for (var i = 0; i < 26; i++) {
                // 大小写同时处理
                const input_l = String.fromCharCode(65 + i);
                const input_L = String.fromCharCode(97 + i);
                this.solveRight(currentState, process, input_l);
                this.solveRight(currentState, process, input_L);
            }
        }
        //如果文法含非终结符D表示数字
        else if (input == "D") {
            for (let i = 0; i <= 9; i++) {
                input = i;
                this.solveRight(currentState, process, input)
            }
        }
    }
    //处理文法右部，我的正规文法都是左线性
    solveRight(currentState, process, input) {
        this.inputChars.add(input);//nfa输入符号集构造
        //A->aM|bN
        if (process.length > 1) {
            const nextStateName = process.slice(1);
            let nextState = this.getStatebyName(nextStateName);
            if (!nextState) nextState = new State(nextStateName);
            this.states.add(nextState);//nfa状态集构造
            currentState.addTransition(input, nextState);//nfa状态转移构造
        }
        //A->a  // 对G中形如A->t的产生式,构造M的一个转换函数f(A,t)=Z。
        else {
            currentState.addTransition(input, this.finalState)
        }
    }
    //求某个状态集合的ε闭包,states是State数组,若求起始状态闭包-epsilonClosure([nfa.startState])
    epsilonClosure(states) {
        let stack = Array.from(states);      //Array.from() 方法从类数组对象或可迭代对象中创建一个新的数组实例，并作为初始栈
        let closure = new Set();             // 创建一个空集合用于存储闭包状态
        while (stack.length > 0) {
            let currentState = stack.pop();  // 从栈中弹出当前状态
            closure.add(currentState);       // 将当前状态加入闭包集合
            // 检查当前状态的 ε 转移，将能够通过 ε 转移到达的状态加入栈中
            if (currentState.transitions["ε"]) {
                for (let nextState of currentState.transitions["ε"]) {
                    if (!closure.has(nextState)) {
                        stack.push(nextState);
                    }
                }
            }
        }
        return closure;
    }

    //  计算状态集合在给定符号下的转移。
    move(states, symbol) {
        let moveSet = new Set();  // 创建一个空集合用于存储移动后的状态集合
        // 对于每个状态，检查是否存在以给定符号进行转移的状态，并将其加入到移动集合中
        for (let state of states) {
            if (state.transitions[symbol]) {
                for (let nextState of state.transitions[symbol]) {
                    moveSet.add(nextState);
                }
            }
        }
        return moveSet;
    }

    // 子集构造算法
    subsetConstruction() {
        let dfaStates = [];  // 存储 DFA 状态的数组
        let unmarkedDfaStates = [];  // 存储未标记的 DFA 状态的数组

        // 计算初始状态的 ε 闭包
        let startStateClosure = this.epsilonClosure([this.startState]);
        // 创建初始 DFA 状态并加入未标记的 DFA 状态数组
        let initialDfaState = new DFAState(startStateClosure);
        dfaStates.push(initialDfaState);
        unmarkedDfaStates.push(initialDfaState);

        // 循环直到没有未标记的 DFA 状态
        while (unmarkedDfaStates.length > 0) {
            let currentDfaState = unmarkedDfaStates.shift();  // 从未标记的 DFA 状态数组中取出一个状态
            let currentNfaStateSet = currentDfaState.nfaStateSet;
            // 遍历每个输入符号
            for (let inputSymbol of this.inputChars) {
                // 计算当前状态经过输入符号后的 NFA 状态集合
                let nextStateSet = this.move(currentNfaStateSet, inputSymbol);
                if (nextStateSet.size === 0) {
                    continue;
                }
                // 计算当前状态经过输入符号后的 NFA 状态集合的 ε 闭包
                let nextStateClosure = this.epsilonClosure(nextStateSet);

                // 查询是否已存在具有相同状态集合的 DFA 状态
                let existingDfaState = this.findDfaStateByNfaStateSet(dfaStates, nextStateClosure);
                // 如果不存在，创建新的 DFA 状态并加入未标记的 DFA 状态数组
                if (existingDfaState === null) {
                    let newDfaState = new DFAState(nextStateClosure);
                    dfaStates.push(newDfaState);
                    unmarkedDfaStates.push(newDfaState);
                    currentDfaState.addTransition(inputSymbol, newDfaState);  // 添加转移情况
                } else {
                    currentDfaState.addTransition(inputSymbol, existingDfaState);  // 添加转移情况
                }
            }
        }
        return dfaStates;
    }
    // 查询目前dfaStates中是否已存在具有状态集合nfaStateSet的 DFA 状态
    findDfaStateByNfaStateSet(dfaStates, nfaStateSet) {
        for (let dfaState of dfaStates) {
            if (this.compareStateSets(dfaState.nfaStateSet, nfaStateSet)) {
                return dfaState;
            }
        }
        return null;
    }

    // 比较两个状态集合是否相同
    compareStateSets(set1, set2) {
        if (set1.size !== set2.size) return false;
        for (let state of set1) {
            if (!set2.has(state)) {
                return false;
            }
        }
        return true;

    }
    NFAtoDFA() {
        const dfaStates = this.subsetConstruction();
        // 标记 DFA 终态
        let finalStates = new Set();
        for (let state of dfaStates) {
            // 检查当前状态是否包含 NFA 的终止状态
            if (state.nfaStateSet.has(this.finalState)) {
                // 如果找到包含 NFA 终止状态的 DFA 状态，则放入finalStates
                finalStates.add(state);
            }
        }
        const dfa = new DFA(dfaStates[0], this.inputChars, dfaStates, finalStates);
        DFAState.resetCounter(); //在创建下一个新的 DFA之前，状态计数器重置，从 1 开始
        return dfa;
    }

}
//创建一个token类，包含起始位置，行号，内容，类型

class DFA {
    //构造函数
    constructor(startState, inputChars, states, finalStates) {
        this.startState = startState;         //初始状态
        this.inputChars = inputChars;         //输入符号集，非终结符
        this.states = states;                 //状态集
        this.finalStates = finalStates;       //终止状态集
    }
    addState(state) {
        this.states.push(state);
    }
    addFinalState(state) {
        this.finalStates.add(state);
    }
    // 识别字符串，返回与该dfa匹配的最大长度;不能识别到一半就结束，即使已经到达终止状态，也要继续识别，直到识别不到为止
    matchToken(input) {
        let ans = 0;
        let max = 0;
        let currentState = this.startState;
        for (let i = 0; i < input.length; i++) {
            let next = currentState.transitions[input[i]];
            if (next) {
                //console.log("识别到"+input[i]);
                currentState = next;
                ans++;
                if (this.finalStates.has(next)) {
                    max = max > ans ? max : ans;
                }
            }
            else {
                break;
            }
        }
        return max;
    }
}

class Token {
    constructor(lineNumber, type, value) {
        this.lineNumber = lineNumber;
        this.type = type;
        this.value = value;
    }

    toString() {
        return `Token(lineNumber=${this.lineNumber}, type=${this.type}, value=${this.value})`;
    }
}
// 打印所有NFA信息
function PrintNFA() {
    nfaArray.forEach((nfa, index) => {
        console.log("第" + `${index + 1}` + "个nfa:");
        process.stdout.write("状态集：");
        nfa.states.forEach((state) => {
            process.stdout.write(state.name + " ");
        })
        console.log();
        process.stdout.write("输入字符集：");
        nfa.inputChars.forEach((inputchar) => {
            process.stdout.write(inputchar + " ");
        })
        console.log();
        nfa.states.forEach((state) => {
            nfa.inputChars.forEach((inputchar) => {
                const nextStates = state.transitions[inputchar];
                if (nextStates) {
                    process.stdout.write(state.name + " 输入 " + inputchar + " 结果是：")
                    nextStates.forEach(nextstate => {
                        process.stdout.write(nextstate.name + " ");
                    })
                    console.log();
                }
            })
        })
    })
}
// 打印所有DFA信息
function PrintDFA() {
    dfaArray.forEach((dfa, index) => {
        console.log("第" + `${index + 1}` + "个dfa:");
        process.stdout.write("状态集：");
        dfa.states.forEach((state) => {
            process.stdout.write("状态"+state.name + ": ");
            //对应的nfa状态集
            state.nfaStateSet.forEach((nfastate) => {
                process.stdout.write(nfastate.name + " ");
            })
        })
        console.log();
        process.stdout.write("输入字符集：");
        dfa.inputChars.forEach((inputchar) => {
            process.stdout.write(inputchar + " ");
        })
        console.log()
    })
}

//根据输入识别token三元组和错误单词
function recognizeTokens(inputText) {
    let lineNumber = 1;
    let errbuffer = '';
    //i是当前识别的位置
    for (i = 0; i < inputText.length;) {
        //跳过空格和换行符
        while (inputText[i] === ' ' || inputText[i] === '\n' || inputText[i] === '\r') {
            if (inputText[i] === '\n') {
                lineNumber++;
            }
            i++;
        }
        if (i >= inputText.length) break;

        //跳过注释部分
        if (inputText[i] === '/' && inputText[i + 1] === '/' && inputText[i - 1] === '\n') {
            while (inputText[i] !== '\n') {
                i++;
            }
            lineNumber++;
            i++;
            continue;
        }

        let tokenlen = 0;
        let type = '';
        //文法的定义顺序就是识别的优先顺序，所以按顺序识别
        for (const dfa of dfaArray) {
            let length = dfa.matchToken(inputText.slice(i));
            if (length > 0) {
                tokenlen = length;
                type = [...dfa.startState.nfaStateSet][0].name;
                type = type.slice(1, type.length - 1);//去掉type两边的尖括号
                break;
            }
        }

        //如果此次识别长度为0,说明无法识别,则将错误单词加入错误列表
        if (tokenlen === 0) {
            //界符或者空格等，不加入错误单词
            while (inputText[i] && inputText[i] !== ' ' && inputText[i] !== '\r' && i < inputText.length && inputText[i] !== ';' && inputText[i] !== '}' && inputText[i] !== ')') {
                errbuffer += inputText[i];
                console.log(errbuffer.length);
                i++;
            }
            errlist.push({ lineNumber, word: errbuffer });
            errbuffer = '';
            continue;
        }
        //如果识别长度不为0,但是本身是字母数字，后面是字母或者数字，说明识别不完整，将错误单词加入错误列表
        else if (inputText[i + tokenlen]&&/[a-zA-Z0-9]/.test(inputText[i + tokenlen]) && /[a-zA-Z0-9]/.test(inputText[i])) {
            //识别到断开为止
            while (inputText[i] !== ' ' && inputText[i] !== '\n' && inputText[i] !== '\r' && i < inputText.length && inputText[i] !== ';' && inputText[i] !== '}' && inputText[i] !== ')' && inputText[i] !== '(' && inputText[i] !== '{') {
                errbuffer += inputText[i];
                i++;
            }
            errlist.push({ lineNumber, word: errbuffer });
            errbuffer = '';
            continue;
        }
        const value = inputText.slice(i, i + tokenlen);
        tokens.push(new Token(lineNumber, type, value));
        i += tokenlen;
    }
}

//错误处理
function errorHandle() {
    for (const error of errlist) {
        //错误提示，如果字符串全是数字,那么检查错误原因是否常量以0开头
        if (/^\d+$/.test(error.word)) {
            if (error.word[0] === "0") {
                let str = "line " + error.lineNumber + ": error!!! '" + error.word + "' 整数常量不能以0开头"
                errorInfo.push(str);
            }
        }
        //错误提示，如果字符串是字母数字，那么检查错误原因是否是标识符以数字开头
        else if (/^\d$/.test(error.word[0])) {
            let str = "line " + error.lineNumber + ": error!!! '" + error.word + "' 标识符不能以数字开头"
            errorInfo.push(str);
        }
        else {
            {
                let str = "line " + error.lineNumber + ": error!!! '" + error.word + "' 不符合词法规范 "
                errorInfo.push(str);
            }
        }
    }
}
//词法分析
function lexicalAnalysis(inputText, grammerPath) {
    //每次分析前清空
    nfaArray = [];  //存储nfa
    dfaArray = [];  //存储dfa
    tokens = [];    //记录所有单词
    errlist = [];   //记录所有错误单词
    errorInfo = []; //记录错误信息
    num = 0;          // nfa/dfa个数
    return new Promise((resolve, reject) => {
        console.log('开始词法分析');
        // 创建逐行读取接口
        const rl = readline.createInterface({
            input: fs.createReadStream(grammerPath), // 指定输入流为文件流
            output: process.stdout, // 输出到控制台
            terminal: false // 不将输入输出视为终端
        });
        let flag;    // 是否是文法第一行
        // 逐行读取正规文法， 构建所有NFA
        rl.on('line', (grammarline) => {
            if (grammarline) {
                //如果以*开头，一个文法开始。
                if (grammarline.startsWith('*')) {
                    nfaArray.push(new NFA());
                    num++;
                    flag = true;
                    return; // 退出当前回调函数,读下一行
                }
                nfaArray[num - 1].generateNFA(grammarline, flag);//用每行产生式生成nfa
                flag = false;
            }
        });
        // 监听读取结束事件
        rl.on('close', () => {
            console.log('文件读取结束');
            //PrintNFA();
            nfaArray.forEach((nfa, index) => {
                const closure_init = nfa.epsilonClosure([nfa.startState]);
                /*
                process.stdout.write(`第${index + 1}个NFA的起始状态ε闭包,即第${index + 1}个DFA的初始状态： `)
                closure_init.forEach((item => {
                    process.stdout.write(item.name + " ");
                }))
                console.log();*/
                dfaArray.push(nfa.NFAtoDFA());
            })
            PrintDFA();
            // 识别token
            recognizeTokens(inputText);

            //错误处理
            errorHandle();
            //打印tokens
            console.log("tokens:");
            tokens.forEach((token) => {
                console.log(token.toString());
            })
            if (errorInfo.length > 0) {
                console.log("错误信息：");
                errorInfo.forEach((error) => {
                    console.log(error);
                })
            }
            // 解析 promise，返回tokens
            resolve({ tokens, errorInfo });
            console.log('词法分析结束');
        });
    })
}
//const input = fs.readFileSync('test.txt', 'utf8');
//lexicalAnalysis(input, './lexer_grammar.txt');
module.exports = {
    lexicalAnalysis
}