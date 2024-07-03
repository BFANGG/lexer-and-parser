//LR1分析法
const { Console } = require('console');
const e = require('express');
const fs = require('fs');
const { get } = require('http');
const path = require('path');
let terminalMap = new Map(); //非终结符映射，实际符号->文法符号
let mapTerminal = new Map(); //文法符号映射，文法符号->实际符号，为了方便输出错误信息
let nonTerminals = []; //非终结符集合
let terminals = [];   //终结符集合
let productions = []; //产生式集合
let projectArray = []; //项目对象集合
let projectSets = []; //项目集族
let errorInfo = [];   //错误信息
let vis = [];         //标记数组，用于判断某非终结符的FIRST集是否已经求出
let vis2 = [];        //标记数组，用于判断某非终结符的FOLLOW集是否已经求出

// 非终结符类，包括非终结符的名字，相同非终结符的右部集合(为了求闭包方便)
class NonTerminal {
    first = new Set();
    follow = new Set();
    constructor(value) {
        this.value = value;
        this.right = [];
    }
}
//产生式类，包括产生式的左部和右部
class Production {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }
}
//项目类，包括项目的产生式，项目的点在右部的位置，搜索符集合
class Project {
    //项目编号，每创建一个项目就自动从1开始递增
    static count = 1;
    constructor(production, dotPos, search) {
        this.count = Project.count;
        Project.count++;
        this.production = production;
        this.dotPos = dotPos;
        this.search = search;
    }
    toString() {
        let right = this.production.right;
        let str = this.production.left + '->';
        for (let i = 0; i < right.length; i++) {
            if (i === this.dotPos) {
                str += '.' + right[i];
            }
            else {
                str += right[i];
            }
        }
        if (this.dotPos === right.length) {
            str += '.';
        }
        str += ',{';
        this.search.forEach((s) => {
            str += s + ',';
        });
        str += '}';
        return str;

    }
}
//项目集类，包括项目集的项目集合和项目集的转移
class ProjectSet {
    //项目集编号，每创建一个项目就自动从0开始递增
    static count = 0;
    constructor(projectSet, go) {
        this.count = ProjectSet.count;
        ProjectSet.count++;
        this.projectSet = projectSet;
        this.go = go;
    }
    print() {
        this.projectSet.forEach((project) => {
            console.log(project.toString());
        });

    }
}
//根据产生式集合生成非终结符集合和终结符集,可识别右部的|分隔符
function buildSymbolSet(productions) {
    // 根据产生式集合生成非终结符集合
    productions.forEach((production) => {
        let left = production.left;
        let right = production.right;
        //生成非终结符集；为了后续查右部方便，非终结符集中是非终结符类的集合，包含该非终结符的名字和相同非终结符的右部集合
        let flag = false;
        nonTerminals.forEach((nonTerminal) => {
            //如果非终结符集中已经有该非终结符，直接把右部加入该非终结符的右部集合
            if (left === nonTerminal.value) {
                //right可能以|分隔，所以要分割
                let temp = right.split('|');
                temp.forEach((r) => {
                    nonTerminal.right.push(r);
                });
                flag = true;
            }
        });
        //否则新建一个非终结符类，加入非终结符集
        if (!flag) {
            let nonTerminal = new NonTerminal(left);
            //right可能以|分隔，所以要分割
            let temp = right.split('|');
            temp.forEach((r) => {
                //console.log(r)
                nonTerminal.right.push(r);
            });
            nonTerminals.push(nonTerminal);
        }
    });
    // 根据非终结符集合生成终结符集合,文法中不是非终结符的就是终结符
    nonTerminals.forEach((nonTerminal) => {
        nonTerminal.right.forEach((right) => {
            for (let i = 0; i < right.length; i++) {
                let symbol = right[i];
                //如果右部某个符号不是非终结符，加入终结符集
                let flag = false;
                nonTerminals.forEach((nonTerminal) => {
                    if (symbol === nonTerminal.value) {
                        flag = true;
                    }
                });
                if (!flag) {
                    if (symbol !== 'ε' && symbol !== '|') {
                        flag = false;
                        terminals.forEach((terminal) => {
                            if (symbol === terminal) {
                                flag = true;
                            }
                        });
                        if (!flag) {
                            terminals.push(symbol);
                        }
                    }
                }
            }
        });
    });
}
//获取一个字符串β的FIRST集,β属于Vt*,可以是空串
function getStrFirst(β) {
    let firstSet = new Set();
    //如果β为空串，直接加入空串
    if (β === 'ε') {
        firstSet.add('ε');
        return firstSet;
    }
    //如果β是终结符，直接加入该终结符
    if (terminals.indexOf(β[0]) !== -1) {
        firstSet.add(β[0]);
        return firstSet;
    }
    //如果β是非终结符，找到该非终结符的FIRST集
    if (nonTerminals.some((nonTerminal) => nonTerminal.value === β[0])) {
        nonTerminals.forEach((nonTerminal) => {
            if (nonTerminal.value === β[0]) {
                getFirst(nonTerminal);
                let flag = 0;  //标记是否ε在该非终结符的FIRST集中
                //把该非终结符的FIRST集/ε加入FIRST集
                nonTerminal.first.forEach((f) => {
                    if (f !== 'ε') {
                        firstSet.add(f);
                    }
                    else {
                        flag = 1;
                    }
                });
                //如果ε在该非终结符的FIRST集中
                if (flag) {
                    //如果β大小大于1，递归求β的FIRST集
                    if (β.length > 1) {
                        let temp = getStrFirst(β.substr(1));
                        temp.forEach((t) => {
                            firstSet.add(t);
                        });
                    }
                    //否则说明β->ε,把ε加入FIRST集
                    else {
                        firstSet.add('ε');
                    }
                }
            }
        });
    }
    return firstSet;
}
//获取某非终结符对象x的FIRST集
function getFirst(x) {
    if (vis[x.value]) return;
    vis[x.value] = true;
    let right = x.right;
    let first = x.first;
    right.forEach((r) => {
        //first(x) = first(r1) U first(r2) U ... U first(rn)
        let tempfirst = getStrFirst(r);
        tempfirst.forEach((f) => {
            first.add(f);
        });
    });
}
// 在产生式集合中找到产生式对象
function getProduction(left, right) {
    for (let i = 0; i < productions.length; i++) {
        let left2 = productions[i].left;
        let right2 = productions[i].right;
        if (left === left2 && right === right2) {
            return productions[i];
        }
    }
    let production = new Production(left, right);
    productions.push(production);
    return production;
}
// 判断某个项目是否已经在项目对象集合中，如果是，则返回该项目对象，否则返回新建对象,并加入项目对象集合
function getProject(production, dotPos, search) {
    for (let i = 0; i < projectArray.length; i++) {
        //判断相等
        let left = projectArray[i].production.left;
        let right = projectArray[i].production.right;
        let dotPos2 = projectArray[i].dotPos;
        let search2 = projectArray[i].search;
        if (production.left === left && production.right === right && dotPos === dotPos2) {
            //search，search2两个Set类型的对象不能直接比较
            if (search.size === search2.size) {
                let flag = true;
                search.forEach((s) => {
                    if (!search2.has(s)) {
                        flag = false;
                    }
                });
                if (flag) {
                    return projectArray[i];
                }
            }
        }
    }
    let project = new Project(production, dotPos, search);
    projectArray.push(project);
    return project;
}
// 判断某个项目集是否已经在项目集对象集合中，如果是，则返回该项目集对象，否则返回null
function getProjectSet(projectSet) {
    for (let i = 0; i < projectSets.length; i++) {
        let flag = true;
        if (projectSets[i].projectSet.size === projectSet.size) {
            projectSets[i].projectSet.forEach((project) => {
                if (!projectSet.has(project)) {
                    flag = false;
                }
            });
            if (flag) {
                return projectSets[i];
            }
        }
    }
    return null;
}
/*
//LR1思想：p145 项目集构造原理: 若[A->α.Bβ]∈项目集I，则[B->.γ]也属于I(B->γ为一产生式)。
 由此不妨考虑把FIRST(β)作为用产生式B->γ规约的搜索符,称为向前搜索符，作为规约时应该查看的符号集合。
 把此搜索符号集合放在相应项目的后面。
*/
//构造LR(1)项目集的闭包函数;返回项目集projectSet的闭包
function closure(projectSet) {
    let queue = [];   //未扩展的项目的集合
    projectSet.forEach((project) => {
        queue.push(project);
    });
    let closureSet = new Set();
    // 求闭包
    while (queue.length > 0) {
        let project = queue.shift();
        closureSet.add(project); //先把该未扩展项目加入闭包
        let right = project.production.right;
        let dotPos = project.dotPos;
        let search = project.search; //该项目的向前搜索符集合
        //如果.不在最后
        if (dotPos < right.length) {
            // next是right[dotPos]后的符号串
            let next = right.slice(dotPos, right.length);
            //console.log("next " + next)
            // 如果点后是非终结符，则扩展项目,需要查看该非终结符后面的符号串β的FIRST集,A->α.Bβ
            nonTerminals.forEach((nonTerminal) => {
                if (nonTerminal.value === next[0]) {
                    nonTerminal.right.forEach((r) => {
                        let production = getProduction(nonTerminal.value, r);  //获取该右部对应的产生式
                        //β是非终结符next[0]后的符号串
                        let β = next.slice(1, next.length);
                        //console.log("β " + β)
                        let flag = false; //标记是否ε在first(β)中,或者β为空串
                        let newSearch = new Set();
                        //将first(βa)加入到项目的搜索符集合中,其中a是search中的符号
                        //即如果β可以推出空串，把search加入到项目的搜索符集合中
                        if (β.length === 0) {
                            flag = true;
                        }
                        else {
                            //console.log("β： "+β)
                            let set = getStrFirst(β);
                            set.forEach((s) => {
                                if (s !== 'ε') {
                                    newSearch.add(s);
                                }
                                else {
                                    flag = true;
                                }
                            });
                        }
                        //如果ε在first(β)或者β为空串中，把search加入到项目的搜索符集合中
                        if (flag) {
                            search.forEach((s) => {
                                newSearch.add(s);
                            });
                        }
                        // 如果该非终结符可以推出空串，则直接构建A->ε. ,即该项目可以凭空规约
                        let project
                        if (r === 'ε') {
                            project = getProject(production, 1, newSearch);
                        }
                        else {
                            project = getProject(production, 0, newSearch);
                        }
                        if (!closureSet.has(project)) {
                            queue.push(project);
                        }
                    });
                }
            })

        }
    }
    return closureSet;
}
//构造LR(1)项目集的转移函数；计算项目集projectSet经过符号symbol转移后的项目集
function move(projectSet, symbol) {
    let newProjectSet = new Set();
    //遍历项目集中的每个项目，找到点后是symbol的项目，移进
    projectSet.forEach((project) => {
        let right = project.production.right;
        let dotPos = project.dotPos;
        let search = project.search;
        //.后是当前symbol，移进
        if (dotPos < right.length && right[dotPos] === symbol) {
            //移进，产生式不变，点的位置加1，后跟符号集合不变
            let newProject = getProject(project.production, dotPos + 1, search);
            newProjectSet.add(newProject);
        }
    });
    newProjectSet = closure(newProjectSet);
    return newProjectSet;
}
// 根据一个初始产生式，构建LR(1)项目集族projectSets,其中每个元素是一个项目集对象，包含项目集和转移
function buildProjectSets() {
    //初始项目
    let initProject = getProject(productions[0], 0, new Set(['#']));
    console.log("初始项目：");
    console.log(initProject.toString());
    //初始项目集
    let initSet = closure([initProject]);
    initialSetObj = new ProjectSet(initSet, new Map());
    projectSets.push(initialSetObj);
    console.log("初始项目集：");
    initialSetObj.print();
    //根据初始项目集对象，求项目集族
    let queue = [];            //未求转移的项目集对象的集合
    queue.push(initialSetObj); //把初始项目集加入未求转移的项目集对象的集合
    while (queue.length > 0) {
        let untransSet = queue.shift();  //取出一个未求转移的项目集对象
        let projectSet = untransSet.projectSet;
        //求根据点后的符号求项目集的转移
        //求点后符号的集合
       // let symbols = new Set();
        projectSet.forEach((project) => {
            let right = project.production.right;
            if (project.dotPos < right.length) {
                let symbol = right[project.dotPos];
               // symbols.add(symbol);
                //求当前项目集在该symbol下的转移项目集
                let newProjectSet = move(projectSet, symbol);
                // 若转移项目集不为空，则需要添加转移，并把转移项目集放入未转移
                if (newProjectSet.size > 0) {
                    let newSetObj = getProjectSet(newProjectSet);
                    //如果newSetObj为null，即该转移项目集不在项目集对象集合中，需要新建，添加到项目集族和未求转移的项目集对象的集合中
                    if (newSetObj === null) {
                        newSetObj = new ProjectSet(newProjectSet, new Map());
                        projectSets.push(newSetObj);
                        queue.push(newSetObj);
                    }
                    untransSet.go.set(symbol, newSetObj);
                }
            }
        });
    }
}
// 构建LR(1)分析表,即构建ACTION和GOTO表
function buildLR1Table() {
    //初始化ACTION和GOTO表
    let ACTION = [];
    let GOTO = [];
    // 一个项目集视为一个状态，状态i即项目集i; 遍历每个状态，来构建每个状态面临某输入符号时的动作
    projectSets.forEach((projectSet, i) => {
        ACTION[i] = new Map();
        GOTO[i] = new Map();
        let action = ACTION[i];
        let goto = GOTO[i];
        //遍历项目集中的每个项目，找到规约项目和移进项目，执行相应动作,移进Si(i为移进后状态状态编号)，规约rj(j为规约使用的产生式编号)
        projectSet.projectSet.forEach((project) => {
            let right = project.production.right;
            let dotPos = project.dotPos;
            let search = project.search;
            //如果点在最后，即规约项目; 只有当面临符号属于搜索符集合时，才做相应规约动作
            if (dotPos === right.length) {
                //console.log("规约项目：" + project.toString())
                //如果是开始符号，即S'->S，接受
                if (project.production.left === nonTerminals[0].value) {
                    search.forEach((s) => {
                        action.set(s, 'acc');
                    });
                }
                else {
                    //找到规约产生式的编号
                    let index = productions.indexOf(project.production);
                    search.forEach((s) => {
                        action.set(s, 'r' + index);
                        // console.log("规约动作：" + s + " r" + index);
                    });
                }
            }
            //如果点不在最后
            else {
                let symbol = right[dotPos];
                //如果是终结符，即移进项目; 当面临符号是点后的符号时，做相应移进动作
                if (terminals.indexOf(symbol) !== -1) {
                    let newProjectSet = projectSet.go.get(symbol);
                    let newState = projectSets.indexOf(newProjectSet);
                    action.set(symbol, 'S' + newState);
                }
                //如果是非终结符，即待约项目A->α.Bβ; GOTO(i,B)=j
                else {
                    let newProjectSet = projectSet.go.get(symbol);
                    let newState = newProjectSet.count;
                    goto.set(symbol, newState);
                }
            }
        });
    })
    //返回ACTION和GOTO表
    return { ACTION, GOTO };
}
// 根据LR(1)分析表，分析token序列是否符合文法
function parse(ACTION, GOTO, tokenList) {
    let stateStack = [];   //状态栈
    let symbolStack = [];  //符号栈
    stateStack.push(0);    //初始状态为0
    symbolStack.push('#'); //初始符号栈为#，表示开始
    //新建一个由tokenlist转换为的token序列对象，添加#，表示结束
    let tokens = [];
    tokenList.forEach((token) => {
        tokens.push(token);
    });
    tokens.push({ type: '#', value: '#' });
    let i = 0;             //输入token指针
    while (true) {
        console.log("token" + i + " :" + tokens[i].value)
        //如果i超出token序列长度，i指向#，即结束符号
        if (i >= tokens.length) {
            i = tokens.length - 1;
        }
        //当前token
        let token = tokens[i];
        //栈顶状态
        let state = stateStack[stateStack.length - 1];
        //当前输入符号
        let input;
        //当前动作
        let action;
        //文法可能匹配一类token比如关键字，也可能匹配某个具体的token比如if,bool
        input = terminalMap.get(token.type); //当前面临token的类型
        //根据ACTION表，找到当前状态面临当前输入符号input时的动作
        action = ACTION[state].get(input);
        //如果匹配token的type失败，尝试匹配token的value
        if (action === undefined) {
            //如果是name是单个字符，直接匹配
            if (token.value.length === 1) {
                input = token.value; //当前面临token的值
                action = ACTION[state].get(input);
            }
            //如果是name是字符串，在文法里通过一个映射表，映射成单个非终结符;比如while->w,所以现在要找w
            else {
                input = terminalMap.get(token.value);
                action = ACTION[state].get(input);
            }
        }
        console.log("input:" + input + " action:" + action)

        //移进
        if (action && action[0] === "S") {
            let nextState = parseInt(action.slice(1));  //比如S2,截取2
            i++;
            stateStack.push(nextState);
            symbolStack.push(input);
        }
        //规约
        else if (action && action[0] === "r") {
            let production = productions[parseInt(action.slice(1))]; //比如r2,截取2,表示按第二个产生式规约
            console.log(production.left + '->' + production.right)
            let right = production.right;
            let left = production.left;
            //右部不为空，弹出产生式右部符号
            if (right !== 'ε') {
                for (let i = 0; i < right.length; i++) {
                    stateStack.pop();
                    symbolStack.pop();
                }
            }
            //此时栈顶状态
            state = stateStack[stateStack.length - 1];
            console.log("栈顶状态state:" + state + "面临符号left:" + left)
            //此时面临符号为规约产生式的左部符号(非终结符)
            let nextState = GOTO[state].get(left);
            console.log("规约后GOTO到state:" + nextState)
            stateStack.push(nextState);
            symbolStack.push(left);
            console.log("符号栈:" + symbolStack)
        }
        //接受
        else if (action === "acc") {
            console.log("接受");
            return true;
        }
        //错误
        else {
            //根据当前状态对应的项目集，找到期待的符号
            let expect = new Set();
            let projectSet = projectSets[state];
            console.log("当前项目集：");
            projectSet.print();
            projectSet.projectSet.forEach((project) => {
                let right = project.production.right;
                let dotPos = project.dotPos;
                let search = project.search;
                if (dotPos === right.length) {
                    search.forEach((s) => {
                        if (mapTerminal.get(s)) {
                            expect.add(mapTerminal.get(s));
                        } else {
                            expect.add(s);
                        }
                    });
                }
            });
            console.log("错误");
            let errInfo1 = "语法错误：第" + tokens[i].lineNumber + "行," + "附近有错误";
            let errInfo2 = "错误符号: '" + tokens[i].value+"'";
            let errInfo3 = "期待符号:";
            expect.forEach((e) => {
                errInfo3 += e + " ";
            });
            errorInfo.push(errInfo1);
            errorInfo.push(errInfo2);
            errorInfo.push(errInfo3);

            //console.log(errInfo1);
            //console.log(errInfo2)
            //console.log(errInfo3)
            //console.log(expect)
            return false;   //返回错误的token,从而可以打印错误信息
        }
    }
}
function syntaxAnalysis(grammarPath, tokenList) {
    errorInfo = [];
    console.log('语法分析开始');
    console.log(tokenList)
    // 读取文法文件parser_grammar.txt
    const filePath = path.join(__dirname, grammarPath);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    // 按行识别文法为产生式集合
    const lines = fileContent.split('\r\n');
    // 如果行开头是*，则跳过;如果开头是#，如果开头是#，则根据映射建立terminalMap，表示某实际符号对应的文法符号;否则是产生式
    let grammarLines = [];
    lines.forEach((line) => {
        if (line[0] === '#') {
            let grammar = line.split('->')[0].split('#')[1].trim();
            let real = line.split('->')[1].trim();
            terminalMap.set(real, grammar);
            mapTerminal.set(grammar, real);
        }
        else if (line[0] !== '*' && line.length > 0) {
            grammarLines.push(line);
        }
    });
    //打印符号映射
    console.log('符号映射：');
    console.log(terminalMap);
    // 扩展文法，添加产生式 S'->原开始符号
    let start = grammarLines[0].split('->')[0].trim();
    productions.push(new Production("S\'", start));
    // 读取产生式集合
    for (let line of grammarLines) {
        let production = new Production(line.split('->')[0].trim(), line.split('->')[1].trim());
        productions.push(production);
    }
    //根据产生式集合填入终结符和非终结符集合
    buildSymbolSet(productions);
    console.log('非终结符集合：');
    console.log(nonTerminals);
    console.log('终结符集合：');
    console.log(terminals);
    //求每个非终结符的FIRST集
    nonTerminals.forEach((nonTerminal) => {
        getFirst(nonTerminal)
    });
    //打印每个非终结符的FIRST集
    console.log('每个非终结符的FIRST集：');
    nonTerminals.forEach((nonTerminal) => {
        console.log(nonTerminal.value + ': ');
        console.log(nonTerminal.first);
    });
    //构建项目集族
    buildProjectSets();
    console.log('项目集族：');
    
    projectSets.forEach((projectSet) => {
        console.log('项目集' + projectSet.count + ':');
        projectSet.print();
    });
    //构建LR(1)分析表
    let { ACTION, GOTO } = buildLR1Table();
    /*
    console.log('ACTION表：');
    for (let i = 0; i < ACTION.length; i++) {
        console.log("状态" + i + ":")
        if (ACTION[i].size > 0) {
            console.log(ACTION[i])
        }
    }
    
    console.log('GOTO表：');
    for (let i = 0; i < GOTO.length; i++) {
        console.log("状态" + i + ":")
        if (GOTO[i].size > 0) {
            console.log(GOTO[i])
        }
    }*/
    parse(ACTION, GOTO, tokenList);
    if(errorInfo.length === 0){ 
        console.log('语法分析成功');
    }
    else{
        console.log('语法分析失败');
        errorInfo.forEach((err) => {       
            console.log(err);
        }); 
    }
    console.log('语法分析结束');
    return errorInfo;
}
//测试LR1分析表构建
function test(grammarPath) {
    errorInfo = [];
    console.log('测试LR1分析表构建');
    // 读取文法文件parser_grammar.txt
    const filePath = path.join(__dirname, grammarPath);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    // 按行识别文法为产生式集合
    const lines = fileContent.split('\r\n');
    // 如果行开头是*，则跳过;如果开头是#，如果开头是#，则根据映射建立terminalMap，表示某实际符号对应的文法符号;否则是产生式
    let grammarLines = [];
    lines.forEach((line) => {
        if (line[0] === '#') {
            let grammar = line.split('->')[0].split('#')[1].trim();
            let real = line.split('->')[1].trim();
            terminalMap.set(real, grammar);
            mapTerminal.set(grammar, real);
        }
        else if (line[0] !== '*' && line.length > 0) {
            grammarLines.push(line);
        }
    });
    // 扩展文法，添加产生式 S'->原开始符号
    let start = grammarLines[0].split('->')[0].trim();
    productions.push(new Production("S\'", start));
    // 读取产生式集合
    for (let line of grammarLines) {
        let production = new Production(line.split('->')[0].trim(), line.split('->')[1].trim());
        productions.push(production);
    }
    //根据产生式集合填入终结符和非终结符集合
    buildSymbolSet(productions);
    console.log('非终结符集合：');
    console.log(nonTerminals);
    console.log('终结符集合：');
    console.log(terminals);
    //求每个非终结符的FIRST集
    nonTerminals.forEach((nonTerminal) => {
        getFirst(nonTerminal)
    });
    //打印每个非终结符的FIRST集
    console.log('每个非终结符的FIRST集：');
    nonTerminals.forEach((nonTerminal) => {
        console.log(nonTerminal.value + ': ');
        console.log(nonTerminal.first);
    });
    //构建项目集族
    buildProjectSets();
    console.log('项目集族：');
    projectSets.forEach((projectSet) => {
        console.log('项目集' + projectSet.count + ':');
        projectSet.print();
    });
    //构建LR(1)分析表
    let { ACTION, GOTO } = buildLR1Table();
    
    console.log('ACTION表：');
    for (let i = 0; i < ACTION.length; i++) {
        console.log("状态" + i + ":")
        if (ACTION[i].size > 0) {
            console.log(ACTION[i])
        }
    }
    
    console.log('GOTO表：');
    for (let i = 0; i < GOTO.length; i++) {
        console.log("状态" + i + ":")
        if (GOTO[i].size > 0) {
            console.log(GOTO[i])
        }
    }
    console.log('测试LR1分析表构建结束');
}
//test('parser_grammar-test.txt');
module.exports = {
    syntaxAnalysis
}