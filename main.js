//使用 Express.js，这是一个 Node.js 的 web 应用框架，创建一个 web 服务器，并通过 HTTP 请求将数据发送到前端。
const express = require('express');
const { lexicalAnalysis } = require('./lexer/lexer');
const { syntaxAnalysis } = require('./parser/parser');
const app = express();
const path = require('path');
app.use(express.json());
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.post('/data', (req, res) => {
    let inputText = req.body.input;
    (async () => {
        try {
            const lexer_res = await lexicalAnalysis(inputText, './lexer/lexer_grammar.txt');
            const tokens = lexer_res.tokens;
            //console.log(lexer_res.tokens);
            //console.log(lexer_res.errorInfo);
            if (lexer_res.errorInfo.length > 0) {
                let parser_res = "lexical Analysis error";
                res.json({ lexer_res, parser_res });
                return;
            } else {
                const parser_res = syntaxAnalysis('./parser_grammar.txt', tokens);
                //console.log(parser_res);
                res.json({ lexer_res, parser_res });
            }
        } catch (error) {
            console.error(error);
        }
    })();
});
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});