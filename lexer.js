/**
 * @module lexer  词法分析器
 */


/**
 * 词法分析
 * @param {string} code_str  代码字符串
 */
const lexer = (code_str) => {
    /**
     * 结果token 数组
     * @type { Array<{ type: string, value: string }> }
     */
    const tokens = [];

    let char_index = 0;

    // 遍历代码字符串中的每个字符
    while (char_index !== code_str.length) {

        // 字符串外的任意空白字符就直接跳过了
        if (
            code_str[char_index] === " "
            || code_str[char_index] === "\t"
            || code_str[char_index] === "\n"
        ) {
            char_index += 1;
            continue;
        }

        // 类型判断
        if (
            code_str[char_index] === "n"
            && ( char_index + 1 < code_str.length && code_str[char_index + 1] == "u" ) 
            && ( char_index + 2 < code_str.length && code_str[char_index + 2] == "m" ) 
        ) {
            // 匹配到 num 类型
            tokens.push({
                type: "type",
                value: "num"
            });

            // 一次匹配到了 3 个字符 从 3 个字符后继续开始匹配
            char_index += 3;

            continue;
        }

        if (
            code_str[char_index] === "s"
            && ( char_index + 1 < code_str.length && code_str[char_index + 1] == "t" ) 
            && ( char_index + 2 < code_str.length && code_str[char_index + 2] == "r" ) 
        ) {
            // 匹配到 str 类型
            tokens.push({
                type: "type",
                value: "str"
            });

            char_index += 3;

            continue;
        }


        // 表达式运算符
        if (code_str[char_index] === "+") {
            tokens.push({
                type: "add",
                value: "+"
            });

            char_index += 1;
            continue;
        }

        if (code_str[char_index] === "-") {
            tokens.push({
                type: "sub",
                value: "-"
            });

            char_index += 1;
            continue;
        }

        if (code_str[char_index] === "*") {
            tokens.push({
                type: "mul",
                value: "*"
            });

            char_index += 1;
            continue;
        }

        if (code_str[char_index] === "/") {
            tokens.push({
                type: "div",
                value: "/"
            });

            char_index += 1;
            continue;
        }


        // 比较运算符和赋值符号
        if (code_str[char_index] === ">") {
            if (char_index + 1 < code_str.length && code_str[char_index + 1] === "=") {
                // 是 >=
                tokens.push({
                    type: "gte",
                    value: ">="
                });
    
                char_index += 2;
                continue;
            } else {
                // 只是 >
                tokens.push({
                    type: "gt",
                    value: ">"
                });
    
                char_index += 1;
                continue;
            }
        }

        if (code_str[char_index] === "<") {
            if (char_index + 1 < code_str.length && code_str[char_index + 1] === "=") {
                // 是 <=
                tokens.push({
                    type: "lte",
                    value: "<="
                });
    
                char_index += 2;
                continue;
            } else {
                // 只是 <
                tokens.push({
                    type: "lt",
                    value: "<"
                });
    
                char_index += 1;
                continue;
            }
        }

        if (code_str[char_index] === "=") {
            if (char_index + 1 < code_str.length && code_str[char_index + 1] === "=") {
                // 是 ==
                tokens.push({
                    type: "equal",
                    value: "=="
                });
    
                char_index += 2;
                continue;
            } else {
                // 只是 =  就是赋值符号
                tokens.push({
                    type: "assign",
                    value: "="
                });
    
                char_index += 1;
                continue;
            }
        }

        if (
            code_str[char_index] === "!"
            && (char_index + 1 < code_str.length && code_str[char_index + 1] === "=")
        ) {
            // 是 !=
            tokens.push({
                type: "not_equal",
                value: "!="
            });

            char_index += 2;
            continue;
        }


        // 数字和字符串

        // 数字
        // 我们定义数字分为头部和其他部分  头部可以是 0-9. 中的任意一个字符
        // 其他部分只能是 0-9 中的任意一个字符
        const num_reg_start = /[0-9.]/;
        const num_reg_body = /[0-9]/;
        // 现在是否在匹配数字的头部
        let num_at_head = true;
        // 匹配到的数字
        let num_value = "";

        if (num_reg_start.test(code_str[char_index])) {
            // 是一个数字

            while(true) {
                const char = code_str[char_index];

                if (num_at_head) {
                    if (num_reg_start.test(char)) {
                        num_value += char;
                        char_index += 1;

                        if (char === ".") {
                            // 匹配到 . 了 该匹配数字的 body 部分了
                            num_at_head = false;
                        }

                        continue;
                    } else {
                        break;
                    }
                } else {
                    if (num_reg_body.test(char)) {
                        num_value += char;
                        char_index += 1;

                        continue;
                    } else {
                        break;
                    }
                }
            }

            tokens.push({
                type: "number",
                value: num_value
            });

            continue;
        }

        // 字符串
        let str_value = "";

        if (code_str[char_index] === "\"") {
            // 说明是一个字符串
            str_value += "\"";
            char_index += 1;

            while(true) {
                const char = code_str[char_index];
                
                str_value += char;
                char_index += 1;

                if (char === "\"") {
                    break;
                }
            }

            tokens.push({
                type: "string",
                value: str_value
            });

            continue;
        }


        // 逻辑相关

        // 函数声明
        if (
            code_str[char_index] === "f"
            && (char_index + 1 < code_str.length && code_str[char_index + 1] === "n")
        ) {
            tokens.push({
                type: "fn_decl",
                value: "fn"
            });

            char_index += 2;

            continue;
        }

        // 函数返回
        if (
            code_str.substring(char_index, char_index + 6) === "return"
        ) {
            tokens.push({
                type: "return_decl",
                value: "return"
            });

            char_index += 6;

            continue;
        }

        // 选择 if - else
        if (
            code_str.substring(char_index, char_index + 2) === "if"
        ) {
            tokens.push({
                type: "if_decl",
                value: "if"
            });

            char_index += 2;

            continue;
        }

        if (
            code_str.substring(char_index, char_index + 4) === "else"
        ) {
            tokens.push({
                type: "else_decl",
                value: "else"
            });

            char_index += 4;

            continue;
        }

        // 循环 for - continue - break
        if (
            code_str.substring(char_index, char_index + 5) === "while"
        ) {
            tokens.push({
                type: "while_decl",
                value: "while"
            });

            char_index += 5;

            continue;
        }

        if (
            code_str.substring(char_index, char_index + 8) === "continue"
        ) {
            tokens.push({
                type: "continue_decl",
                value: "continue"
            });

            char_index += 8;

            continue;
        }

        if (
            code_str.substring(char_index, char_index + 5) === "break"
        ) {
            tokens.push({
                type: "break_decl",
                value: "break"
            });

            char_index += 5;

            continue;
        }


        // 其他符号

        // 大括号
        if (code_str[char_index] === "{") {
            tokens.push({
                type: "open_brace",
                value: "{"
            });

            char_index += 1;
            continue;
        }

        if (code_str[char_index] === "}") {
            tokens.push({
                type: "close_brace",
                value: "}"
            });

            char_index += 1;
            continue;
        }

        // 小括号
        if (code_str[char_index] === "(") {
            tokens.push({
                type: "open_bracket",
                value: "("
            });

            char_index += 1;
            continue;
        }

        if (code_str[char_index] === ")") {
            tokens.push({
                type: "close_bracket",
                value: ")"
            });

            char_index += 1;
            continue;
        }

        // 分号
        if (code_str[char_index] === ";") {
            tokens.push({
                type: "semi",
                value: ";"
            });

            char_index += 1;
            continue;
        }

        // 逗号
        if (code_str[char_index] === ",") {
            tokens.push({
                type: "comma",
                value: ","
            });

            char_index += 1;
            continue;
        }


        // 上面的都不是的话 认为当前正在处理的是一个 id
        // 我们定义 id 可以由数字 字母 下划线组成 但一定要由字母和下划线开头
        /** 匹配 id 开头的正则 */
        const id_reg_start = /[a-zA-Z_]/;
        /** 匹配 id 其他部分的正则 */
        const id_reg_body = /[a-zA-Z0-9_]/;
        /** 现在是否在匹配 id 的开头部分 */
        let id_at_head = true;
        /** 匹配到的字符串 */
        let id_value = "";

        // 当前字符符合 id 的首字母规则
        if (id_reg_start.test(code_str[char_index])) {
            while(true) {
                const char = code_str[char_index];

                if (id_at_head) {
                    id_value += char;
                    id_at_head = false;
                    char_index += 1;
                } else {
                    if (id_reg_body.test(char)) {
                        id_value += char;
                        char_index += 1;
                    } else {
                        break;
                    }
                }
            }

            // 存储匹配到的 id
            tokens.push({
                type: "id",
                value: id_value
            });

            continue;
        }
        
        // 还不是就报错
        throw Error(`未知的字符: '${ code_str[char_index] }',  当前 token 序列为: ${ JSON.stringify(tokens) }`);
    }

    return tokens;
};


export default lexer;
