/**
 * @module code-generator  代码生成
 */


/**
 * 将 parser 中的类型定义复制到此处
 * 
 * @typedef { "num" | "str" | "fn" } LABEL_TYPE_T
 * 
 * @typedef {{ 
*  id: number, 
*  type: LABEL_TYPE_T, 
*  name: string,
*  return_type: "num" | "str" | null
* }} LABEL_T 
*/
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
 * @typedef { "load_name" | "load_value" | "load_const" | "assign" | "add" | "sub" | "mul" | "div" | "compare_above" | "compare_above_equal" | "compare_below" | "compare_below_equal" | "compare_equal" | "compare_not_equal" | "jmp" | "jmp_remove" | "jmp_true_remove" | "jmp_false_remove" | "call" | "ret" | "create_scope" | "delete_scope" | "nop" | "seek" } OPT
 * 
 * @typedef {{
 *  action: OPT,
 *  value: any
 * }} OPCodeT
 */

/**
 * 保存了生成的代码中所有函数存放的位置的对象
 * @type {{ [props: string]: number }}
 */
let function_map = {};

// 保存了内建函数名字的数组
const builtin_functions_name = ['print'];


/**
 * 代码生成函数 专门处理表达式
 * @param {AST_T} ast  语法树
 * @param {LABEL_T[]} labels_table  符号表
 * @param {AST_T[]} scopes  遍历到的节点列表
 * @returns {OPCodeT[]}
 */
const expr_generator = (ast, labels_table, scopes) => {
    if (ast.type === "string_iter") {
        return [
            { action: "load_const", value: ast.body[0] }
        ];
    }

    if (ast.type === "number_iter") {
        return [
            { action: "load_const", value: +ast.body[0] }
        ];
    }

    if (ast.type === "type") {
        // 类型信息不会携带到代码中 因此在这里不需要进行处理 直接返回即可
        return [];
    }

    if (ast.type === "target") {
        const target_label_info = labels_table.find(label => label.id === ast.body[0]);

        return [
            { action: "load_name", value: target_label_info?.name },
            { action: "load_value", value: null }
        ];
    }

    if (
        ast.op === "add" 
        || ast.op === "sub" 
        || ast.op === "mul" 
        || ast.op === "div"
    ) {
        const left_part_ast = ast.body[0];
        const right_part_ast = ast.body[1];

        // @ts-ignore
        const left_part_code = expr_generator(left_part_ast, labels_table, [ ...scopes, ast ]);
        // @ts-ignore
        const right_part_code = expr_generator(right_part_ast, labels_table, [ ...scopes, ast ]);

        const expr_code = [ ...left_part_code, ...right_part_code, { action: ast.op, value: null } ];

        return expr_code;
    }

    if (
        ast.op === "gt" 
        || ast.op === "gte" 
        || ast.op === "lt" 
        || ast.op === "lte"
        || ast.op === "equal"
        || ast.op === "not_equal"
    ) {
        const left_part_ast = ast.body[0];
        const right_part_ast = ast.body[1];

        // @ts-ignore
        const left_part_code = expr_generator(left_part_ast, labels_table, [ ...scopes, ast ]);

        // @ts-ignore
        const right_part_code = expr_generator(right_part_ast, labels_table, [ ...scopes, ast ]);

        /** @type {OPCodeT[]} */
        const expr_code = [ 
            ...left_part_code, 
            ...right_part_code, 
            { 
                action: 
                    ast.op === "gt" ? "compare_above"
                    : ast.op === "gte" ? "compare_above_equal"
                    : ast.op === "lt" ? "compare_below"
                    : ast.op === "lte" ? "compare_below_equal"
                    : ast.op === "equal" ? "compare_equal"
                    : "compare_not_equal"
                , 
                value: null 
            }
        ];

        return expr_code;
    }

    if (ast.op === "func_call") {
        /** @type {OPCodeT[]} */
        let func_call_code = [
            { action: "create_scope", value: null }
        ];

        const func_call_target_ast = ast.body[0];
        const func_call_args_ast = ast.body.slice(1);


        // 而后找到函数的 ast 引用 找出其中函数参数的信息
        // @ts-ignore
        const func_label = labels_table.find(label => label.id === func_call_target_ast.body[0]);
        const is_builtin_function = builtin_functions_name.find(n => n === func_label?.name) !== undefined;

        for (let i=0; i<func_call_args_ast.length; i++) {
            /** @type {AST_T} */
            // @ts-ignore
            const func_call_arg_ast = func_call_args_ast[i];

            const arg_code = expr_generator(func_call_arg_ast, labels_table, [ ...scopes, ast ]);

            if (is_builtin_function) {
                func_call_code = [ 
                    ...func_call_code, 
                    { action: "load_name", value: `arg_${i}` },
                    ...arg_code,
                    { action: "assign", value: null }
                ];
            } else {
                // @ts-ignore
                const original_func_ast = scopes[0].body.find(ast => ast.type === "function" && ast.body[0].body[0] === func_label?.id);

                // @ts-ignore
                const original_func_args = original_func_ast.body.slice(2, original_func_ast.body.length - 1);

                const original_func_arg_label = labels_table.find(label => label.id === original_func_args[i].body[0]);

                // @ts-ignore
                // const func_call_arg_label = labels_table.find(label => label.id === func_call_arg_ast.body[0]);

                // const arg_code = expr_generator(func_call_arg_ast, labels_table, [ ...scopes, ast ]);

                func_call_code = [ 
                    ...func_call_code, 
                    { action: "load_name", value: original_func_arg_label?.name },
                    ...arg_code,
                    { action: "assign", value: null }
                ];
            }
        }

        func_call_code = [
            ...func_call_code,
            { action: "call", value: func_label?.name },
            { action: "delete_scope", value: null }
        ];


        return func_call_code;
    }

    throw Error("不能作为表达式的 ast");
};


/**
 * 代码生成函数
 * @param {AST_T} ast  语法树
 * @param {LABEL_T[]} labels_table  符号表
 * @param {AST_T[]} scopes  遍历到的节点列表
 * @returns {OPCodeT[]}
 */
const code_generator = (ast, labels_table, scopes) => {
    /** @type {OPCodeT[]} */
    let code = [];

    // 先处理 "最终值" 和表达式相关的内容
    // 最终值的下面除了直接的字面量外不会有更深层的子 ast 了
    // 最终值相关的 ast 我们都放到 expr_generator 中处理

    // 再处理非最终值
    // 这些 ast 的子代还可以有更子代的 ast
    // 需要遍历并递归处理它们
    for (let i=0; i<ast.body.length; i++) {
        const current_ast = ast.body[i];

        if (typeof current_ast === "string" || typeof current_ast === "number") {
            throw Error(`意外的 current_ast  它的类型是 string 或 number`);
        }

        if (current_ast.type === "action") {
            if (current_ast.op === "none") {
                // op 为 none 的 ast 的 type 一般都是 string_iter 之类的值
                // 这些值在上面都处理完了 不会出现在这里
                // 出现就算错误
                throw Error("action 的 op 为 none");
            }

            if (current_ast.op === "assign") {
                /** @type {OPCodeT[]} */
                let assign_code = [];

                const assign_target_ast = current_ast.body[0];
                const assign_value_ast = current_ast.body[1];


                // 先处理左值
                // @ts-ignore
                const assign_target_label_info = labels_table.find(label => label.id === assign_target_ast.body[0]);

                assign_code = [
                    ...assign_code,
                    {
                        action: "load_name",
                        value: assign_target_label_info?.name
                    }
                ];


                // 再处理右值
                // @ts-ignore
                const assign_value_code = expr_generator(assign_value_ast, labels_table, [ ...scopes, current_ast ]);

                // // 右值中的所有 name 我们均需在其后面添加 load_value 命令
                // let assign_value_index = 0;

                // while (assign_value_index < assign_value_code.length) {
                //     const op = assign_value_code[assign_value_index];

                //     if (op.action ==="load_name") {
                //         assign_value_code.splice(assign_value_index + 1, 0, { action: "load_value", value: null });
                //     }
                    
                //     assign_value_index += 1;
                // }

                assign_code = [ ...assign_code, ...assign_value_code, { action: "assign", value: null } ];

                code = [
                    ...code,
                    ...assign_code
                ];

                continue ;
            }

            if (current_ast.op === "if") {
                const if_cond_ast = current_ast.body[0];
                const if_true_ast = current_ast.body[1];
                /** @type {AST_T | null} */
                let if_else_ast = null;

                if (current_ast.body.length >= 3) {
                    // @ts-ignore
                    if_else_ast = current_ast.body[2];
                }


                /** @type {OPCodeT[]} */
                let if_code = [];

                // @ts-ignore
                const if_cond_code = expr_generator(if_cond_ast, labels_table, [ ...scopes, current_ast ]);

                if_code = [ 
                    ...if_cond_code, 
                    { action: "jmp_true_remove", value: 2 }, 
                    // 这里应该还有一个 jmp_false_remove
                    // 但它的取值需要在生成完 if true 部分的 code 后再生成
                ];
                

                // @ts-ignore
                const if_true_code = code_generator(if_true_ast, labels_table, [ ...scopes, current_ast ]);

                if_code = [
                    ...if_code,
                    { 
                        action: "jmp_false_remove", 
                        value: if_else_ast === null ? if_true_code.length + 1 : if_true_code.length + 2
                    },
                    ...if_true_code
                ];

                // 如果有 false 块的话
                if (if_else_ast !== null) {
                    const if_else_code = code_generator(if_else_ast, labels_table, [ ...scopes, current_ast ]);

                    if_code = [
                        ...if_code,
                        { action: "jmp", value: if_else_code.length + 1 },
                        ...if_else_code
                    ];
                }


                code = [ ...code, ...if_code ];

                continue ;
            }
            
            if (current_ast.op === "while") {
                // 记得替换 break 和 continue
                const while_cond_ast = current_ast.body[0];
                const while_body_ast = current_ast.body[1];

                /** @type {OPCodeT[]} */
                let while_code = [];


                // @ts-ignore
                const while_cond_code = expr_generator(while_cond_ast, labels_table, [ ...scopes, current_ast ]);

                while_code = [
                    ...while_cond_code,
                    { action: "jmp_true_remove", value: 3 }
                ];


                // @ts-ignore
                const while_body_code = code_generator(while_body_ast, labels_table, [ ...scopes, current_ast ]);

                while_code = [
                    ...while_code,
                    { action: "jmp_remove", value: while_body_code.length + 3 },
                    { action: "jmp", value: while_body_code.length + 2 }
                ];

                // 记录一下 break 代码在 code 中的位置
                const break_index = while_code.length - 1;

                // 填充循环体
                while_code = [
                    ...while_code,
                    ...while_body_code
                ];

                // 填充最后的循环 jmp
                while_code = [
                    ...while_code,
                    { action: "jmp", value: -while_code.length }
                ];

                // 处理循环中的 continue 和 break
                for (let i=0; i<while_code.length; i++) {
                    const op = while_code[i];

                    if (
                        op.action === "jmp" 
                        && (op.value === "break" || op.value === "continue")
                    ) {
                        if (op.value === "break") {
                            op.value = -(i - break_index);
                            continue ;
                        }

                        // op.value === "continue"
                        op.value = -i;
                        continue ;
                    }
                }


                code = [ ...code, ...while_code ];

                continue ;
            }
            
            if (current_ast.op === "break" || current_ast.op === "continue") {
                // break 和 continue 需要在上层的 while 循环处理完后再进行处理
                // 所以这里直接返回一个占位符即可
                // continue 需要 jmp 到循环的开始位置处
                // break 需要 jmp 到循环的结束 jmp 处

                code = [ ...code, { action: "jmp", value: `${current_ast.op}` }  ];

                continue ;
            }
            
            if (current_ast.op === "return") {
                /** @type {OPCodeT[]} */
                let return_code = [];

                if (current_ast.body.length >= 0) {
                    // @ts-ignore
                    const return_body_code = expr_generator(current_ast.body[0], labels_table, [ ...scopes, current_ast ]);

                    return_code = [
                        ...return_body_code
                    ];
                }

                return_code = [
                    ...return_code,
                    { action: "ret", value: null }
                ];


                code = [ ...code, ...return_code ];

                continue ;
            }

            // 处理直接以 f(); 形式调用的函数
            if (current_ast.op === "func_call") {
                const func_call_code = expr_generator(current_ast, labels_table, [ ...scopes, current_ast ]);

                // 直接调用 忽略返回值形式的函数调用需要使用 seek 来平衡栈
                code = [ ...code, ...func_call_code, { action: "seek", value: 1 } ];
        
                continue ;
            }
        }

        if (current_ast.type === "function") {
            // 在这里我们不仅需要转换函数 还需要记录函数在 code 中的位置
            // 所幸 我们定义只有在根作用域下才能定义函数  也即当我们处在这里时
            // 我们肯定处在根作用域下  此时我们可以简单地获取 code.length 来直接获取到可靠的 本函数转换后首个指令所处的位置
            // 我们只需将此值存储在 function_map 中即可

            const func_name_ast = current_ast.body[0];
            const func_body_ast = current_ast.body[current_ast.body.length - 1];

            // 首先查询函数的名字
            // @ts-ignore
            const func_label = labels_table.find(label => label.id === func_name_ast.body[0]);

            // 存储函数的位置  +1 是因为要留出一个 jmp 的空间
            // @ts-ignore
            function_map[func_label?.name] = code.length + 1;

            // 处理函数体
            // @ts-ignore
            const func_code = code_generator(func_body_ast, labels_table, [ ...scopes, current_ast ]);


            code = [ ...code, { action: "jmp", value: func_code.length + 1 }, ...func_code ];

            continue ;
        }

        if (current_ast.type === "program") {
            // program 的话 就只需要递归地解析它就好了
            const program_code = code_generator(current_ast, labels_table, [ ...scopes, current_ast ]);

            code = [ ...code, ...program_code ];

            continue ;
        }
    }

    return code;
};


/**
 * 代码生成函数
 * @param {AST_T} ast  语法树
 * @param {LABEL_T[]} labels_table  符号表
 */
export default (ast, labels_table) => {
    const code = code_generator(ast, labels_table, [ ast ]);

    // 替换函数调用
    // for (let i=0; i<code.length; i++) {
    //     const op = code[i];

    //     if (op.action === "call") {
    //         if (function_map[op.value] !== undefined) {
    //             op.value = function_map[op.value];
    //         } else {
    //             throw Error("意外错误 替换函数调用时无法找到函数");
    //         }
    //     }
    // }
    // 不必再替换了 现在改为 call 指令后面直接写要调用的函数名
    // 而后查阅函数名-code数组下标对应表直接跳转
    // 现在返回值中要附带一个函数名对code数组下标对应表了

    return {
        code,
        function_map,
        call_stack: [],
        op_stack: [],
        scope_stack: []
    };
};
