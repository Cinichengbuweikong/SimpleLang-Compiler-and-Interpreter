/**
 * @module parser  语法解析器
 */


/**
 * 创建符号表以及对符号表操作的函数
 * @param {LABEL_T[]} buildin_apis  语言内置 API 定义
 */
function create_labels_table(buildin_apis) {
    // 符号表需要保存如下信息:
    // 变量名 变量类型 变量编号

    // 符号表有一个特点 只新增 不删除
    // 这是符号的挺行所决定的 我们只能新增一个符号 或是在现有符号上继续操作
    // 但不可能删除一个符号

    /**
     * @typedef { "num" | "str" | "fn" } LABEL_TYPE_T
     * 
     * @typedef {{ 
     *  id: number, 
     *  type: LABEL_TYPE_T, 
     *  name: string,
     *  return_type: "num" | "str" | null
     * }} LABEL_T 
     */

    /** 当前新 label 应该使用的 id */
    let current_label_id = buildin_apis.length;

    /**
     * labels_table 中存储的是最终的符号表
     * @type {LABEL_T[]}
     */
    const labels_table = [
        ...buildin_apis
    ];

    /**
     * scoped_labels_table 中存储的也是符号表 但其携带作用域信息
     * 这个数组起到了一个栈的作用  越是栈底的元素就越是表示更远 更大范围的作用域
     * 越是栈顶的元素就越是表示更小范围 更近的作用域
     * 对象中的 key 必须是变量的名字
     * @type {{ [props: string]: LABEL_T }[]}
     */
    const scoped_labels_table = [];

    /**
     * 当我们新进入到一个作用域时 我们需要先在 scoped_labels_table 中 push 一个 {}
     * 存储当前作用域内的符号表  对象中的 key 必须是变量的名字 这样我们后续才能直接按照变量名来索引 label
     * 此后每存储一个新符号时 我们都需要先检查当前栈顶到栈底内所有作用域内 有没有一个同名的变量
     * 有如下情况:
     *  现在是变量声明 & 函数定义:
     *      只检查本作用域下是否有一个同名的符号:
     *          有: 报错 变量重复定义
     *          没有: 在本作用域下定义一个新符号
     *  现在是变量赋值:
     *      从本作用域开始 向顶部作用域(在这里就是从栈顶到栈底)检查每个作用域下是否有同名符号 查到即停止
     *          有: 标记这个操作操作的就是这个变量
     *          没有: 报错 变量未定义
     *  使用变量(表达式中 & 函数调用):
     *      需查询被使用的变量是否存在  不存在则报错
     * 
     * 每次我们离开一个作用域时 我们就要把栈顶弹出
     * 
     * 每次我们新在 {} 中 push 一个符号的时候 我们都要将此符号一并 push 到 labels_table 中最终的保存
     * 但在 scoped_labels_table pop 一个作用域时 我们不在 labels_table 中做任何事
     * 
     * 所有符号的 id 都应该是唯一的 
     */


    /**
     * 新建一个作用域  也即在当前栈的栈顶新建一个作用域
     */
    const create_new_scope = () => {
        scoped_labels_table.push({});
    };

    /**
     * 删除当前栈顶作用域
     */
    const delete_current_scope = () => {
        scoped_labels_table.pop();
    };

    /**
     * 在当前作用域下新增一个 label
     * 方法返回新建的 label
     * 
     * @param { string } name  label 的名字 就写变量和函数的名字
     * @param {LABEL_TYPE_T} type  label 的类型  变量就写变量的类型  函数就写 "fn"
     * @param { "num" | "str" | null } return_type  仅在 type 取值 fn 时有效  表示函数返回值的类型
     * @returns {LABEL_T}
     */
    const add_label_to_current_scope = (name, type, return_type = null) => {
        /** @type {LABEL_T} */
        const new_label = {
            id: current_label_id,
            name,
            type,
            return_type
        };

        scoped_labels_table[scoped_labels_table.length - 1][name] = new_label;
        labels_table.push(new_label);

        current_label_id += 1;

        return new_label;
    };

    /**
     * 检查从当前开始的 所有作用域下是否存在一个指定名字的变量
     * 方法返回一个 LABEL_T | null 类型的值  查询到了就返回查询到的数据  没查询到就返回 null
     * 
     * @param {string} name
     * @returns {LABEL_T | null}
     */
    const query_name_from_all_scope = (name) => {
        let res = null;

        for (let i = scoped_labels_table.length - 1; i >= 0; i--) {
            const current_scope = scoped_labels_table[i];

            if (current_scope[name] !== undefined) {
                res = current_scope[name];
                break;
            }
        }

        // 如果 res 还是 null 的话  检查代码是否正在尝试调用一个由语言实现的 API / 语言定义的变量  例如 print
        if (res === null) {
            const find_res = labels_table.find(api_info => api_info.name === name);

            if (find_res !== undefined) {
                res = find_res;
            }
        }

        return res;
    };

    // 返回符号表的函数
    const get_labels_table = () => labels_table;

    /**
     * 抛出异常的函数
     * @param { "mutiple_def" | "not_def" } err_type
     * @param { string } err_info
     */
    const throw_label_error = (err_type, err_info) => {
        throw new Error(
            err_type === "mutiple_def" ? `变量多次定义 ${err_info}` : `变量未定义 ${err_info}`
        );
    };


    return {
        create_scope: create_new_scope,
        delete_current_scope,

        add_label: add_label_to_current_scope,
        query_name: query_name_from_all_scope,
        
        get_labels_table,
        throw_label_error
    };
}


const { 
    create_scope, 
    delete_current_scope, 
    add_label, 
    query_name, 
    get_labels_table,
    throw_label_error
} = create_labels_table([
    { id: 0, type: "fn", name: "print", return_type: null }
]);


/**
 * @typedef {{ 
 *      type: "program" | "action" | "string_iter" | "number_iter" | "target" | "function" | "type", 
 *      op: "none" | "assign" | "add" | "sub" | "mul" | "div" | "func_call" | "if" | "while" | "break" | "continue" | "return" | "gt" | "gte" | "lt" | "lte" | "equal" | "not_equal", 
 *      body: (AST_T | string | number)[]
 * }} AST_T  ast 节点类型
 * 
 * type 指节点的类型:
 *      program  代码块
 *      action  动作
 *      string_iter  字符串字面量
 *      number_iter  数字字面量
 *      target  目标
 * 
 * op 指节点表示的操作:
 *      none  没有任何操作
 *      assign  赋值
 *      add  加
 *      sub  减
 *      mul  乘
 *      div  除
 *      func_call  函数调用
 *      break  for 中的 break
 *      continue  for 中的 continue
 * 
 * body  操作数
 */


/**
 * 辅助函数 把 token 作为错误信息抛出
 * @param {{ type: string, value: string }} token 
 */
const throw_token = (token) => {
    throw Error(`${token.type} - ${token.value}`);
};


/**
 * @param {Array<{ type: string, value: string }>} token_arr 
 */
const parser = (token_arr) => {
    /**
     * 新建抽象语法树的根节点
     * @type {AST_T}
     */
    const ast = {
        type: "program",
        op: "none",
        body: []
    };

    // 符号表
    const labels_table = {};

    // 当前正在处理的 token 的下标
    let token_index = 0;


    /**
     * 实际解析 expr tokens 为 ast 的函数
     * @param {any[]} expr_tokens 
     * @returns {AST_T}
     */
    const _parse_expr = (expr_tokens) => {
        // 首先把 token 列表中的所有非操作符的元素变为 ast 中的一个节点
        for (let index = 0; index < expr_tokens.length; index++) {
            if (expr_tokens[index].type === "number") {
                expr_tokens[index] = {
                    type: "number_iter",
                    op: "none",
                    body: [expr_tokens[index].value]
                };
            }

            if (expr_tokens[index].type === "string") {
                expr_tokens[index] = {
                    type: "string_iter",
                    op: "none",
                    body: [expr_tokens[index].value]
                };
            }

            if (expr_tokens[index].type === "add") {
                expr_tokens[index] = {
                    type: "action",
                    op: "add",
                    body: []
                };
            }

            if (expr_tokens[index].type === "sub") {
                expr_tokens[index] = {
                    type: "action",
                    op: "sub",
                    body: []
                };
            }

            if (expr_tokens[index].type === "mul") {
                expr_tokens[index] = {
                    type: "action",
                    op: "mul",
                    body: []
                };
            }

            if (expr_tokens[index].type === "div") {
                expr_tokens[index] = {
                    type: "action",
                    op: "div",
                    body: []
                };
            }

            if (expr_tokens[index].type === "id") {
                const current_label_info = query_name(expr_tokens[index].value);

                if (current_label_info === null) {
                    throw_label_error("not_def", expr_tokens[index].value);
                }

                expr_tokens[index] = {
                    type: "target",
                    op: "none",
                    body: [
                        // @ts-ignore
                        current_label_info.id
                    ]
                };
            }

            if (expr_tokens[index].type === "gt") {
                expr_tokens[index] = {
                    type: "action",
                    op: "gt",
                    body: [
                        expr_tokens[index].value
                    ]
                };
            }

            if (expr_tokens[index].type === "gte") {
                expr_tokens[index] = {
                    type: "action",
                    op: "gte",
                    body: [
                        expr_tokens[index].value
                    ]
                };
            }

            if (expr_tokens[index].type === "lt") {
                expr_tokens[index] = {
                    type: "action",
                    op: "lt",
                    body: [
                        expr_tokens[index].value
                    ]
                };
            }

            if (expr_tokens[index].type === "lte") {
                expr_tokens[index] = {
                    type: "action",
                    op: "lte",
                    body: [
                        expr_tokens[index].value
                    ]
                };
            }

            if (expr_tokens[index].type === "equal") {
                expr_tokens[index] = {
                    type: "action",
                    op: "equal",
                    body: [
                        expr_tokens[index].value
                    ]
                };
            }

            if (expr_tokens[index].type === "not_equal") {
                expr_tokens[index] = {
                    type: "action",
                    op: "not_equal",
                    body: [
                        expr_tokens[index].value
                    ]
                };
            }
        }

        // 而后先处理 token 列表中的 * 和 /  先把它们都处理为一个小的 ast
        // 类似于数学中先算乘除  在这里就是先结合 * / 运算符的 ast
        let expr_token_index = 0;

        while (expr_token_index < expr_tokens.length) {
            if (
                expr_tokens[expr_token_index].type === "action"
                && (
                    expr_tokens[expr_token_index].op === "mul"
                    || expr_tokens[expr_token_index].op === "div"
                )
            ) {
                // 拿出左侧的元素 拿出右侧的元素 拼接在一起 得到一个子 ast
                const left_part = expr_tokens[expr_token_index - 1];
                const right_part = expr_tokens[expr_token_index + 1];

                if (
                    left_part.type !== "action"
                    && left_part.type !== "string_iter"
                    && left_part.type !== "number_iter"
                ) {
                    throw_token(token_arr[token_index + expr_token_index]);
                }

                const current_ast = expr_tokens[expr_token_index];

                // @ts-ignore
                current_ast.body = [left_part, right_part];

                // 删除左右的 ast  再把新生成的 ast 插入进去
                expr_tokens.splice(expr_token_index - 1, 3, current_ast);

                // 由于删除了左侧的 ast  需要让 expr_token_index -1
                // 这里没有这么做 是因为如果不让 expr_token_index -1 的话 删除一个元素再添加一个元素后
                // 当前 expr_token_index 正好指向下一个未处理的 token
                // 我们可以自己试着想一下

                continue;
            }

            expr_token_index += 1;
        }

        // 剩余的只是 + 和 - 和一些其他比较运算符的 ast  可以直接逐级拼接了
        // 我们仍会继续使用 expr_token_index  这里先将其置 0
        // 这里的处理思路可以继续沿用上面处理 * / 时的思路
        // 注: 这里就设置不支持 -1 这种写法了  想表示 -1 需要写 0-1
        expr_token_index = 0;

        while (expr_token_index < expr_tokens.length) {
            // 一直处理 直到整个表达式收缩为一个 ast
            if (expr_tokens.length === 1) {
                break;
            }

            if (
                expr_tokens[expr_token_index].type === "action"
                && (
                    expr_tokens[expr_token_index].op === "add"
                    || expr_tokens[expr_token_index].op === "sub"
                    || expr_tokens[expr_token_index].op === "gt"
                    || expr_tokens[expr_token_index].op === "gte"
                    || expr_tokens[expr_token_index].op === "lt"
                    || expr_tokens[expr_token_index].op === "lte"
                    || expr_tokens[expr_token_index].op === "equal"
                    || expr_tokens[expr_token_index].op === "not_equal"
                )
            ) {
                const left_part = expr_tokens[expr_token_index - 1];
                const right_part = expr_tokens[expr_token_index + 1];

                const current_ast = expr_tokens[expr_token_index];

                // @ts-ignore
                current_ast.body = [left_part, right_part];

                expr_tokens.splice(expr_token_index - 1, 3, current_ast);

                continue;
            }

            expr_token_index += 1;
        }

        return expr_tokens[0];
    };

    /**
     * 解析 expr  expr 需要使用单独的逻辑进行解析
     * parse_expr 函数负责读取下一个 token 并整理 expr 的 token 的列表 而后把 expr token 的 ast 返回给上层
     * 解析 expr token 为 ast 的功能由 _parse_expr 函数实现
     * 
     * 注: parse_expr 在遇到分号后就停止 此时 token_index 指向结束的分号 这点要注意 
     * @param {AST_T} parent_ast  父级 ast 对象
     */
    const parse_expr = (parent_ast) => {
        /** @type {any[]} */
        const expr_tokens = [];

        // 首先收集表达式中的所有 token  如果已经是分号了 那就停止
        while (token_arr[token_index].type !== "semi") {
            expr_tokens.push(token_arr[token_index]);

            token_index += 1;
        }

        const expr_ast = _parse_expr(expr_tokens);

        parent_ast.body.push(expr_ast);
    };


    /**
     * 解析函数调用
     * @param {AST_T} parent_ast  父级 ast 对象
     */
    const parse_func_call_expr = (parent_ast) => {
        if (!(
            token_arr[token_index].type === "id"
            && (token_index + 1) < token_arr.length
            && token_arr[token_index + 1].type === "open_bracket"
        )) {
            // 语法错误
            throw_token(token_arr[token_index]);
        }


        const current_label_info = query_name(token_arr[token_index].value);

        if (current_label_info === null) {
            throw_label_error("not_def", token_arr[token_index].value);

            return ;
        }

        /** @type {AST_T} */
        const func_call_ast = {
            type: "action",
            op: "func_call",
            body: [
                // body 的第一个元素是被调用的函数的信息
                {
                    type: "target",
                    op: "none",
                    body: [
                        current_label_info.id
                    ]
                }

                // body 中的其他元素是函数的参数 ast
            ]
        };

        // 本 token 解析完毕  跳过下一个 (   处理下一个内容
        token_index += 2;

        // 是否匹配到了 ) ?
        let match_close_bracket = false;

        while (!match_close_bracket) {
            if (token_arr[token_index].type === "close_bracket") {
                // 可能一上来就已经是一个 ) 了
                match_close_bracket = true;
            }

            // 函数的参数可以是一个变量名 也可以是一个表达式
            // 收集每个逗号之间的表达式 而后把它们放到表达式处理函数中处理

            const expr_tokens = [];

            while (true) {
                if (token_arr[token_index].type === "comma") {
                    // 可以匹配下一个元素了
                    token_index += 1;
                    break;
                }

                if (token_arr[token_index].type === "close_bracket") {
                    match_close_bracket = true;
                    break;
                }

                expr_tokens.push(token_arr[token_index]);
                token_index += 1;
            }

            // 只有当调用的 () 中有表达式时才解析
            if (expr_tokens.length !== 0) {
                const expr_ast = _parse_expr(expr_tokens);

                func_call_ast.body.push(expr_ast);
            }
        }

        // 当前 token 已经是 ) 了 现在可以进行下一步解析了
        // token_index+1 后当前 token 应该是一个 ;
        token_index += 1;

        if (token_arr[token_index].type !== "semi") {
            throw_token(token_arr[token_index]);

            return;
        }

        parent_ast.body.push(func_call_ast);

        // 解析 ; 完成 进入下一个 token 的解析
        token_index += 1;
    };


    /**
     * 解析局部代码块中的内容
     * @param {AST_T} parent_ast  父级 ast 对象
     */
    const parse_partical_code_scope = (parent_ast) => {
        // 解析的时候把 } 跳过去再返回  

        /** @type {AST_T} */
        const partical_code_scope_ast = {
            type: "program",
            op: "none",
            body: []
        };

        while (true) {
            if (token_arr[token_index].type === "close_brace") {
                // 本代码块中的内容解析完成

                // 跳过此 } token
                token_index += 1;

                break ;
            }

            // 是不是 if
            else if (token_arr[token_index].type === "if_decl") {
                create_scope();

                parse_if(partical_code_scope_ast);

                delete_current_scope();

                continue;
            }

            // 是不是 while
            else if (token_arr[token_index].type === "while_decl") {
                create_scope();

                parse_while(partical_code_scope_ast);

                delete_current_scope();

                continue ;
            }

            // 是不是 value assign
            else if (token_arr[token_index].type === "type") {
                // 移动到下一个 token 上
                token_index += 1;

                // value assign 的下一个 token 必须是一个 id
                if (token_arr[token_index].type !== "id") {
                    throw_token(token_arr[token_index]);

                    return ;
                }


                // 检查
                if (query_name(token_arr[token_index].value) !== null) {
                    throw_label_error("mutiple_def", token_arr[token_index].value);

                    return ;
                }

                // @ts-ignore
                const current_label_info = add_label(token_arr[token_index].value, token_arr[token_index - 1].value);


                /** @type {AST_T} 新建赋值运算 ast */
                const assign_ast = {
                    type: "action",
                    op: "assign",
                    body: [
                        {
                            type: "target",
                            op: "none",
                            body: [
                                current_label_info.id
                            ]
                        }
                    ]
                };

                // 匹配 =
                token_index += 1;
                if (token_arr[token_index].type !== "assign") { 
                    throw_token(token_arr[token_index]);
                    
                    return ;
                }

                // 移动到 expr 的第一个 token 上 而后解析 expr
                token_index += 1;
                
                if (token_arr[token_index + 1].type === "open_bracket") {
                    // 是函数调用
                    parse_func_call_expr(assign_ast);
                } else {
                    parse_expr(assign_ast);

                    // parse_expr 调用完后  token_index 指向 expr 结束处的分号
                    // 这里让 token_index + 1  让代码可以继续解析下一个 token
                    token_index += 1;
                }

                // 所有 type 类型的 ast  我们均需要使用 push 将代码放到父级 ast 的 body 中
                // 在后续 我们会使用 左-右-中 的顺序来遍历 ast 中的每个节点 而后执行这些节点中的动作
                partical_code_scope_ast.body.push(assign_ast);

                continue;
            }

            // 是不是 func_call 或重新赋值
            else if (token_arr[token_index].type === "id") {
                token_index += 1;

                if (token_arr[token_index].type === "open_bracket") {
                    // 解析函数调用的方法需要从函数名开始解析
                    // 这里回到上一个 token 后再解析函数调用
                    token_index -= 1;

                    parse_func_call_expr(partical_code_scope_ast);
                    
                    continue;
                }
                
                if (token_arr[token_index].type === "assign") {
                    const current_label_info = query_name(token_arr[token_index - 1].value);

                    if (current_label_info === null) {
                        throw_label_error("not_def", token_arr[token_index - 1].value);

                        return ;
                    }

                    /** @type {AST_T} */
                    const assign_ast = {
                        type: "action",
                        op: "assign",
                        body: [
                            {
                                type: "target",
                                op: "none",
                                body: [
                                    current_label_info.id
                                ]
                            }
                        ]
                    };

                    token_index += 1;
                    
                    // 现在 token 是 id 或操作数了

                    if (token_arr[token_index + 1].type === "open_bracket") {
                        // 是函数调用
                        parse_func_call_expr(assign_ast);
                    } else {
                        parse_expr(assign_ast);

                        // 跳过结尾的 ;
                        token_index += 1;
                    }

                    partical_code_scope_ast.body.push(assign_ast);

                    continue ;
                } else {
                    throw_token(token_arr[token_index]);

                    return ;
                }
            }

            // 是不是 continue
            else if (token_arr[token_index].type === "continue_decl") {
                /** @type {AST_T} */
                const continue_ast = {
                    type: "action",
                    op: "continue",
                    body: [
                        token_arr[token_index].value
                    ]
                };

                partical_code_scope_ast.body.push(continue_ast);

                // 下一个 token 必须是 ;
                if (token_arr[token_index + 1].type !== "semi") {
                    throw_token(token_arr[token_index + 1]);

                    return ;
                }

                // 下一个 ; token 已经被处理完了 跳过它 去它的下一个 token 即可
                token_index += 2;
            }

            // 是不是 break
            else if (token_arr[token_index].type === "break_decl") {
                /** @type {AST_T} */
                const break_ast = {
                    type: "action",
                    op: "break",
                    body: [
                        token_arr[token_index].value
                    ]
                };

                partical_code_scope_ast.body.push(break_ast);

                if (token_arr[token_index + 1].type !== "semi") {
                    throw_token(token_arr[token_index + 1]);

                    return ;
                }

                token_index += 2;
            }

            // 是不是 return
            else if (token_arr[token_index].type === "return_decl") {
                /** @type {AST_T} */
                const return_ast = {
                    type: "action",
                    op: "return",
                    body: []
                };

                // 来到下一个 token 上
                token_index += 1;

                // 如果下一个 token 不是 ; 的话 说明要返回一个值
                if (token_arr[token_index].type !== "semi") {
                    parse_expr(return_ast);
                }

                partical_code_scope_ast.body.push(return_ast);

                // 最后跳过结尾的 ;
                token_index += 1;

                continue ;
            }

            // 其他的都算是语法错误
            else {
                throw_token(token_arr[token_index]);
            }
        }

        parent_ast.body.push(partical_code_scope_ast);
    };


    /**
     * 解析 if 语句
     * @param {AST_T} parent_ast  父级 ast 对象
     */
    const parse_if = (parent_ast) => {
        if (
            token_arr[token_index].type !== "if_decl"
            && token_arr[token_index + 1].type !== "open_bracket"
        ) {
            throw_token(token_arr[token_index]);

            return;
        }

        // 让当前 token 指向 ( 后的表达式的第一个 token
        token_index += 2;

        /** @type {AST_T} */
        const if_ast = {
            type: "action",
            op: "if",
            body: [
                // if ast 的第一个元素必须是一个表达式
                // 表达式的值为 0 的话 则认为是 false  否则认为是 true

                // if ast 的第二个元素必须是一个 type 为 program 的 ast
                // 表示条件成立时执行的代码

                // if ast 的第三个元素必须是一个 type 为 program 的 ast
                // 表示条件不成立时执行的代码
            ]
        };


        // 首先收集 if 表达式中的 tokens
        // 这里就设置不能有 if (func()) 这种写法了  只能写为 num i = func();  if (i)
        const if_expr_tokens = [];

        while (token_arr[token_index].type !== "close_bracket") {
            if_expr_tokens.push(token_arr[token_index]);
            token_index += 1;
        }

        const if_expr_ast = _parse_expr(if_expr_tokens);

        if_ast.body.push(if_expr_ast);

        // 现在 token 是一个 close_barcket  移动到下一个 token 上
        token_index += 1;


        // 下一个 token 应该是一个 {
        if (token_arr[token_index].type !== "open_brace") {
            throw_token(token_arr[token_index]);

            return;
        }

        // 跳过它 解析代码块中的内容
        token_index += 1;

        parse_partical_code_scope(if_ast);


        // 看看后续有没有 else
        if (token_arr[token_index].type === "else_decl") {
            // 跳到下一个 token
            token_index += 1;

            // 看看后续是不是一个 {
            if (token_arr[token_index].type !== "open_brace") {
                throw_token(token_arr[token_index]);

                return ;
            }

            //跳到 else 的代码块首部 递归解析
            token_index += 1;

            parse_partical_code_scope(if_ast);
        }

        parent_ast.body.push(if_ast);
    };


    /**
     * 解析 while 循环
     * @param {AST_T} parent_ast  父级 ast 对象
     */
    const parse_while = (parent_ast) => {
        // 跳过此 while_decl token
        token_index += 1;

        // 当前是 for 的话 那下一个 token 必须是一个 (
        if (token_arr[token_index].type !== "open_bracket") {
            throw_token(token_arr[token_index + 1]);

            return ;
        }

        // 跳过此 ( token
        token_index += 1;


        /** @type {AST_T} */
        const while_ast = {
            type: "action",
            op: "while",
            body: [
                // 规定第一个元素必须是表达式 是循环条件
                // 第二个元素必须是一个 program 对象 表示循环体 
            ]
        };


        const while_cond_tokens = [];

        while (token_arr[token_index].type !== "close_bracket") {
            while_cond_tokens.push(token_arr[token_index]);

            token_index += 1;
        }

        const while_cond_ast = _parse_expr(while_cond_tokens);

        while_ast.body.push(while_cond_ast);

        // 现在 token 是 )  +1 跳过它
        token_index += 1;


        // 下一个 token 应该是一个 {
        if (token_arr[token_index].type !== "open_brace") {
            throw_token(token_arr[token_index]);
            return ;
        }

        // 移动到下一个 token
        token_index += 1;

        parse_partical_code_scope(while_ast);


        parent_ast.body.push(while_ast);
    };


    /**
     * 解析 global_code_scope  整个代码文件应该是一个 global_code_scope
     * @param {AST_T} parent_ast  父级 ast 对象
     */
    const parse_global_code_scope = (parent_ast) => {
        create_scope();

        while (token_index < token_arr.length) {
            // 是不是 if
            if (token_arr[token_index].type === "if_decl") {
                create_scope();

                parse_if(parent_ast);

                delete_current_scope();

                continue ;
            }

            // 是不是 while
            else if (token_arr[token_index].type === "while_decl") {
                create_scope();

                parse_while(parent_ast);

                delete_current_scope();

                continue ;
            }

            // 是不是 value assign 或 fn decl
            else if (token_arr[token_index].type === "type") {
                // 移动到下一个 token 上
                token_index += 1;

                // 是 value assign
                if (token_arr[token_index].type === "id") {
                    // 既然是 value assign  我们就知道格式: type id assign expr semi
                    // 也即 当前 token 的上一个 token 一定是当前变量的类型信息
                    // 当前 token 的下一个 token 一定是一个 assign
                    // 当前 token 的下一个 token 一定是一个 expr
                    // 我们只需按照规则解析即可


                    // 是变量声明 首先检查当前作用域内是否已经有一个同名变量了
                    if (query_name(token_arr[token_index].value) !== null) {
                        throw_label_error("mutiple_def", token_arr[token_index].value);

                        return ;
                    }

                    // @ts-ignore
                    const current_label_info = add_label(token_arr[token_index].value, token_arr[token_index - 1].value);


                    /** @type {AST_T} 新建赋值运算 ast */
                    const assign_ast = {
                        type: "action",
                        op: "assign",
                        body: [
                            {
                                type: "target",
                                op: "none",
                                body: [
                                    current_label_info.id
                                ]
                            }
                        ]
                    };

                    // 匹配 =
                    token_index += 1;
                    if (token_arr[token_index].type !== "assign") { throw_token(token_arr[token_index]); }

                    // 移动到 expr 的第一个 token 上 而后解析 expr
                    token_index += 1;

                    if (token_arr[token_index + 1].type === "open_bracket") {
                        // 是函数调用
                        parse_func_call_expr(assign_ast);
                    } else {
                        parse_expr(assign_ast);

                        // parse_expr 调用完后  token_index 指向 expr 结束处的分号
                        // 这里让 token_index + 1  让代码可以继续解析下一个 token
                        token_index += 1;
                    }

                    // 所有 type 类型的 ast  我们均需要使用 push 将代码放到父级 ast 的 body 中
                    // 在后续 我们会使用 左-右-中 的顺序来遍历 ast 中的每个节点 而后执行这些节点中的动作
                    parent_ast.body.push(assign_ast);

                    continue;
                }

                // 是 fn
                if (token_arr[token_index].type === "fn_decl") {
                    // 那下一个 token 必须是一个 id
                    token_index += 1;

                    if (token_arr[token_index].type !== "id") {
                        throw_token(token_arr[token_index]);
                    }


                    // 是函数声明 首先检查当前作用域内是否已经有一个同名变量了
                    if (query_name(token_arr[token_index].value) !== null) {
                        throw_label_error("mutiple_def", token_arr[token_index].value);

                        return ;
                    }

                    const current_label_info = add_label(
                        token_arr[token_index].value, 
                        "fn",
                        // @ts-ignore
                        token_arr[token_index - 2].value
                    );


                    // 再下一个 token 必须是 (
                    token_index += 1;

                    if (token_arr[token_index].type !== "open_bracket") {
                        throw_token(token_arr[token_index]);
                    }


                    // 处理下一个 token
                    token_index += 1;

                    /** @type {AST_T} */
                    const fn_ast = {
                        type: "function",
                        op: "none",
                        body: [
                            // body 中的第一个元素包含了函数的名字
                            // body 中的第二个元素包含了函数的返回值类型信息
                            // body 中其余的元素都是函数参数的 ast
                            // body 中最后一个元素是函数体的 program ast
                            {
                                type: "target",
                                op: "none",
                                body: [
                                    current_label_info.id
                                ]
                            },

                            {
                                type: "type",
                                op: "none",
                                body: [
                                    token_arr[token_index - 4].value
                                ]
                            },
                        ]
                    };

                    // 新建函数作用域
                    create_scope();

                    // 开始处理参数列表
                    while (true) {
                        // 当前应该是一个 type  下一个应该是一个 id
                        // 或者当前直接是一个 )
                        if (
                            token_arr[token_index].type !== "type"
                            || token_arr[token_index + 1].type !== "id"
                        ) {
                            if (token_arr[token_index].type === "close_bracket") {
                                break;
                            }

                            throw_token(token_arr[token_index]);
                            return ;
                        }

                        // 去往 id token
                        token_index += 1;

                        // 是函数参数声明 首先检查当前作用域内是否已经有一个同名变量了
                        if (query_name(token_arr[token_index].value) !== null) {
                            throw_label_error("mutiple_def", token_arr[token_index].value);

                            return ;
                        }

                        // @ts-ignore
                        const current_label_info = add_label(token_arr[token_index].value, token_arr[token_index - 1].value);

                        /** @type {AST_T} */
                        const param_ast = {
                            type: "target",
                            op: "none",
                            body: [
                                current_label_info.id
                            ]
                        };

                        fn_ast.body.push(param_ast);


                        token_index += 1;

                        // 如果 token 是 )  则表示参数处理完成 可以处理下一个 token 了
                        if (token_arr[token_index].type === "close_bracket") {
                            break ;
                        }

                        // 如果下一个 token 是 ,  则表示有其他参数需要继续处理
                        if (token_arr[token_index].type === "comma") {
                            // 处理下一个 token
                            token_index += 1;
                            continue ;
                        }

                        // 其他 token 均为语法错误
                        throw_token(token_arr[token_index]);
                    }

                    // 现在 token 是一个 )  下一个 token 必须是一个 {
                    token_index += 1;

                    if (token_arr[token_index].type !== "open_brace") {
                        throw_token(token_arr[token_index]);
                        return ;
                    }

                    // 跳过 {  现在可以解析函数体了
                    token_index += 1;
                    parse_partical_code_scope(fn_ast);

                    // 释放函数作用域
                    delete_current_scope();

                    parent_ast.body.push(fn_ast);

                    continue ;
                }
            }

            // 是不是 func_call 或重新赋值
            else if (token_arr[token_index].type === "id") {
                if (token_arr[token_index + 1].type === "open_bracket") {
                    // 尝试调用函数
                    // 首先检查此函数是否存在
                    if (query_name(token_arr[token_index].value) === null) {
                        throw_label_error("not_def", token_arr[token_index].value);

                        return ;
                    }

                    parse_func_call_expr(parent_ast);
                    
                    continue;
                }
                
                if (token_arr[token_index + 1].type === "assign") {
                    // 尝试重新赋值
                    // 首先检查目标值是否存在
                    const current_label_info = query_name(token_arr[token_index].value);

                    if (current_label_info === null) {
                        throw_label_error("not_def", token_arr[token_index].value);

                        return ;
                    }

                    // 现在的 token 是 assign 了
                    token_index += 1;

                    /** @type {AST_T} */
                    const assign_ast = {
                        type: "action",
                        op: "assign",
                        body: [
                            {
                                type: "target",
                                op: "none",
                                body: [
                                    current_label_info.id
                                ]
                            }
                        ]
                    };

                    token_index += 1;
                    
                    if (token_arr[token_index + 1].type === "open_bracket") {
                        // 是函数调用
                        parse_func_call_expr(assign_ast);
                    } else {
                        parse_expr(assign_ast);

                        // 跳过结尾的 ;
                        token_index += 1;
                    }

                    parent_ast.body.push(assign_ast);

                    continue ;
                } else {
                    throw_token(token_arr[token_index]);

                    return ;
                }
            }

            // 只能有这几种 token  其他的一律算语法错误
            else {
                throw_token(token_arr[token_index]);
            }
        }

        // 删除 label 列表中的全局作用域
        delete_current_scope();
    };

    try {
        parse_global_code_scope(ast);
    } catch (e) {
        throw Error(`语法错误: ${e}`)
    }


    return { 
        ast, 
        labels_table: get_labels_table() 
    };
};


export default parser;
