# 软件课程设计Ⅱ
# 软件课程设计Ⅱ
## 介绍
本项目是我的软件课设Ⅱ课程设计，其主要内容是构建了一个词法分析器和语法分析器，用js编写，并包装成一个web应用。
## 代码说明
lexer.js是词法分析器源码
lexer_grammar.txt是词法分析器文法
parser.js是语法分析器源码
parser_grammar.txt是语法分析器文法
main.js调用词法分析器和语法分析器，处理从网页传入的输入测试代码，并将结果返回网页显示。
public文件夹中index.html是网页代码。
## 开发环境
语言：javaScript,html
集成开发环境：VSCode
运行环境：nodejs
## 运行方式
确保nodejs环境
打开文件夹，打开终端命令行，在根目录下输入指令：
node mian.js
打开浏览器访问本地3000端口
在lexer-parser导航页输入测试文本，即可获得词法分析和语法分析结果
## 语法分析原文法
//程序
<program> -> <function> <program> | ε
//函数
<function> -> <*type_keyword> <*identifier> ( <parameter> ) { <statements> }
//参数
<parameter> -> <*qualifier_keyword> <*type_keyword> <*identifier> | <*type_keyword> <*identifier> | <*qualifier_keyword> <*type_keyword> <*identifier> , <parameter> | <*type_keyword> <*identifier> , <parameter> | ε
//语句集
<statements> -> <declare_statement> <statements> | <for_statement> <statements>| <while_statement> <statements>| <if_statement> <statements>|<assignment_statement> <statements>|<function_call_statement><statements> | <return_statement>| ε
//声明语句
<declare_statement> -> <*type_keyword> <*identifier> ;| <*type_keyword> <*identifier>= <expression> ;|<*qualifier_keyword><*type_keyword> <*identifier>= <expression> ;
//赋值语句
<assignment_statement> -> <*identifier> <*assignment_operator> <arithmetic_expression> ;
//for语句
<for_statement> -> for ( <for_condition> ) { <statements>} |for ( <for_condition> ) {<statements> break ;}| for ( <for_condition> ){<statements> continue ;} | for ( <for_condition> ){ ε}
<for_condition> -> <assignment_statement> ; <condition> ; <increment>
//while语句
<while_statement> -> while ( <condition> ) { <statements>} | while ( <condition> ){<statements> break ;} | while ( <condition> ){<statements> continue ; } | while ( <condition> ){ ε } 
//条件语句
<if_statement> -> if ( <condition> ) { <statements> } else { <statements> } | if ( <condition> ) { <statements> } | if ( <condition> )
<increment> -> <*identifier>++ | <*identifier>-- | <*identifier> = <arithmetic_expression>
<condition> -> <logical_expression> | <arithmetic_expression>| <*identifier> | <*constant>
//函数调用语句
<function_call_statement> -> <function_call> ;
//return语句
<return_statement> -> return <expression> ; | return ;
//函数调用表达式
<function_call> -> <identifier> ( <parameters> )
<parameters> -> <expression> , <parameters> | <expression> | ε
//表达式
<expression> -> <arithmetic_expression> | <logical_expression> | <function_call> | <*identifier> | <*constant>
//逻辑表达式
<logical_expression> -> <unary_logical_expression> <binary_logical_expression>
//一元逻辑表达式
<unary_logical_expression> -> !<boolean_expression> | <boolean_expression>
//二元逻辑表达式序列
<binary_logical_expression> -> && <unary_logical_expression> <binary_logical_expression> | \\ <unary_logical_expression> <binary_logical_expression>|ε
//布尔表达式，表达式的值为布尔值，包含关系表达式
<boolean_expression> -> true | false | <relational_expression>
//关系表达式
<relational_expression> -> <term> <*relational_operators> <term>
//运算表达式，包括算术运算和位运算
<arithmetic_expression> -> <arithmetic_expression> <arithmetic_operator> <term> |<arithmetic_expression> <bitwise_operator> <term> | <term>
<term> -> <*identifier> | <*constant>
