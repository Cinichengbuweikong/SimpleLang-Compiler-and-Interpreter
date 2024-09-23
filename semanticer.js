/**
 * @module semanticer  语义分析器
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
 * 保存了当前遍历到的节点信息的栈
 * @type {AST_T[]} 
 */
const ast_node_stack = [];


/**
 * 检查表达式语法树的函数  表达式语法树需要进行特殊处理
 * @param {AST_T} ast  表达式语法树根节点
 * @param {LABEL_T[]} labels_table  符号表
 * @param {"num" | "str"} target_type  表达式最终应该求得的值的类型
 * @returns { "num" | "str" }  本函数返回值没有
 */
const expr_checker = (ast, labels_table, target_type) => {
    if (ast.type === "number_iter") {
        if (ast.body.length !== 1) {
            // 必须是一个数字
            throw Error("数字节点中必须只有一个数字");
        }

        if (typeof ast.body[0] !== "string") {
            // 现在的数字还是一个数字字符串 它也必须是一个数字字符串
            throw Error("数字节点中必须是数字字面量内容");
        }

        if (! /[0-9.]+/.test(ast.body[0])) {
            // 数字字符串中必须只有数字和 .
            throw Error("数字节点中必须是数字值");
        }

        if (target_type === "str") {
            throw Error("语义错误 需要一个 str 类型的值 但当前值的类型为 num");
        }

        // 返回表达式最终节点上数据的类型 表示这棵表达式树最终计算出的数据的类型
        return "num";
    }

    if (ast.type === "string_iter") {
        if (ast.body.length !== 1) {
            throw Error("字符串节点中必须只有一个数字");
        }

        if (typeof ast.body[0] !== "string") {
            throw Error("字符串节点中必须是字符串字面量内容");
        }

        if (target_type === "num") {
            throw Error("语义错误 需要一个 num 类型的值 但当前值的类型为 str");
        }

        return "str";
    }

    if (ast.type === "target") {
        // 检查 target 的类型
        const target_label_info = labels_table.find(label => label.id === ast.body[0]);

        if (target_label_info === undefined) {
            throw Error("语义错误  无法在符号表中查得此变量的信息");
        }

        // 也即 不支持类似于 1 + fn() 这样的表达式中夹杂函数调用的写法 虽然它们都是表达式
        if (target_label_info.type === "fn") {
            throw Error("语义错误  fn 类型的 label 不应该出现在这里");
        }

        if (target_label_info.type !== target_type) {
            throw Error(`语义错误  目标类型和 label 的类型不一致: ${target_label_info.type} - ${target_type}`);
        }

        // @ts-ignore
        return target_label_info.type;
    }

    // 定义我们的 SimpleLang 中  数字可以进行 +-*/ > >= < <= == != 运算操作
    // 而字符串只能进行 + == != 运算操作
    // 每种类型的值只能和其相同类型的值相运算

    // 我们认为 不管是 num 还是 str 类型的数据  只要其进行的是 == != 操作
    // 其返回的值都是 num 类型的

    if (ast.op === "add" || ast.op === "equal" || ast.op === "not_equal") {
        const left_part = ast.body[0];
        const right_part = ast.body[1];

        // @ts-ignore
        const left_part_check_res = expr_checker(left_part, labels_table, target_type);
        // @ts-ignore
        const right_part_check_res = expr_checker(right_part, labels_table, target_type);

        if (left_part_check_res === right_part_check_res) {
            if (left_part_check_res !== target_type) {
                throw Error(`语义有误: ${left_part_check_res} - ${target_type}`);
            }

            if (left_part_check_res === "num" || left_part_check_res === "str") {
                if (ast.op === "add") {
                    return left_part_check_res;
                } else {
                    // ast.op === "equal" || ast.op === "not_equal"
                    return "num";
                }
            } else {
                throw Error(`语义有误: ${left_part_check_res}`);
            }
        } else {
            throw Error(`语义有误:  ${left_part_check_res} - ${right_part_check_res}`);
        }
    }

    if (
        ast.op === "sub"
        || ast.op === "mul"
        || ast.op === "div"
        || ast.op === "gt"
        || ast.op === "gte"
        || ast.op === "lt"
        || ast.op === "lte"
    ) {
        const left_part = ast.body[0];
        const right_part = ast.body[1];

        // @ts-ignore
        const left_part_check_res = expr_checker(left_part, labels_table, target_type);
        // @ts-ignore
        const right_part_check_res = expr_checker(right_part, labels_table, target_type);

        if (left_part_check_res === right_part_check_res) {
            if (left_part_check_res !== target_type) {
                throw Error(`语义有误: ${left_part_check_res} - ${target_type}`);
            }

            if (left_part_check_res === "num") {
                return left_part_check_res;
            } else {
                // 不管子树结果是 str 还是其他类型数据
                // 我们的 SimpleLang 中只支持数字相减 而字符串只能进行相加操作
                throw Error(`语义有误:  ${left_part_check_res}`);
            }
        } else {
            throw Error(`语义有误:  ${left_part_check_res} - ${right_part_check_res}`);
        }
    }

    if (ast.op === "func_call") {
        // func_call ast 的 body 中  第一个元素是一个 target  表示要调用哪个函数
        // body 中的其他参数都是 expr ast  表示参数的值
        const func_call_target = ast.body[0];
        const func_call_args = ast.body.slice(1);


        // 再从符号表中查询出函数的信息
        // @ts-ignore
        const func_labels_info = labels_table.find(label => label.id === func_call_target.body[0]);

        if (func_labels_info === undefined) {
            throw Error("语义错误 无法在符号表中查询出函数信息");
        }


        // 首先从作用域中查询出函数的信息
        // 我们知道我们的代码只能在顶层上定义函数 所以我们直接去作用域链的顶层中去查询函数即可
        const target_func_ast = ast_node_stack[0].body.find(ast => {
            return (
                // @ts-ignore
                ast.type === "function" 
                // @ts-ignore
                && ast.body[0].type === "target"
                // @ts-ignore 
                && ast.body[0].body[0] === func_call_target.body[0]
            );
        });

        if (
            target_func_ast === undefined 
            || typeof target_func_ast === "string" 
            || typeof target_func_ast === "number"
        ) {
            throw Error("语义有误 找不到函数定义");
        }


        // 切分出所有原函数的参数信息
        const func_decl_args_info = target_func_ast.body.slice(2, target_func_ast.body.length - 1);

        for (const info of func_decl_args_info) {
            if (typeof info === "string" || typeof info === "number") {
                throw Error("语义错误  ast 应是一个节点");
            }

            if (info.type !== "target") {
                throw Error("语义错误  应该是一个目标");
            }
        }

        // 参数数量应该和原函数定义的参数数量一致
        if (func_call_args.length !== func_decl_args_info.length) {
            throw Error("语义错误  传入的参数的数量和函数参数数量不一致");
        }


        // 校验每个参数表达式 其值的类型应该和参数的类型一致
        for (let i=0; i<func_call_args.length; i++) {
            const arg_value_ast = func_call_args[i];
            const arg_must_info = func_decl_args_info[i];

            if (typeof arg_value_ast === "string" || typeof arg_value_ast === "number") {
                throw Error("语义错误  参数值 ast 不应该是一个 string 或 number 类型的值");
            }

            if (typeof arg_must_info === "string" || typeof arg_must_info === "number") {
                throw Error("语义错误  参数信息 ast 不应该是一个 string 或 number");
            }

            if (arg_must_info.type !== "target") {
                throw Error("语义错误  参数信息 ast 的 type 应为 target");
            }

            const arg_must_label_info = labels_table.find(label => label.id === arg_must_info.body[0]);

            if (arg_must_label_info === undefined) {
                throw Error("语义错误  无法在符号表中找到函数定义时参数的信息");
            }

            // @ts-ignore
            expr_checker(arg_value_ast, labels_table, arg_must_label_info.type);
        }

        // 没有问题 返回函数的返回值类型
        // @ts-ignore
        if (target_func_ast.body[1].type !== "type") {
            throw Error("函数的返回值类型错误");
        }

        // @ts-ignore
        return target_func_ast.body[1].body[0];
    }

    throw Error("语义有误 表达式语义检查时到达了意外的位置");
};


/**
 * 语义分析器函数  如果语法分析树和符号表中的信息合法的话 那方法将不返回任何内容
 * 如果 AST 中存在错误 则函数抛出错误
 * @param { AST_T } ast 
 * @param { LABEL_T[] } labels_table 
 */
const semanticer = (ast, labels_table) => {
    // 中左右顺序 深度优先遍历整棵树

    if (ast.type !== "program") {
        // 每次递归解析的话  ast 都应该是一个 program
        throw Error("语义错误  ast 应该是一个 program");
    }

    for (let child_ast_index = 0; child_ast_index < ast.body.length; child_ast_index++) {
        const child_ast = ast.body[child_ast_index];


        // 不会有这两种情况 出现就算出错
        if (typeof child_ast === "string" || typeof child_ast === "number") {
            throw Error("语义错误  child ast 不应该是 string 或 number");
        }


        // 先进行 "最终值" 的检查
        // "最终值" 包括 string_iter  number_iter  type  target
        // 这些类型的 ast 的 body 中最多只有一个元素 且这个元素一定不会再是 AST_T 类型的数据了
        // 也即这些节点肯定会作为整棵 AST 树的叶子节点而存在 不会出现在其他地方
        // 但在这里 我们不对这些最终值进行检查
        // string_iter  number_iter 的值会在检查表达式时一并检查
        // type 和 target 会在下面它们出现的时候顺带将它们检查了

        // 再对 "非最终值" 进行检查
        // "非最终值" 就是哪些 可以包含更子代的 AST 节点的 AST 节点  它们还可以继续拆分插件
        // 这里需要对其进行递归处理
        if (child_ast.type === "action") {
            if (child_ast.op === "none") {
                // op 为 none 的节点一般都是最终值 ast  在上面已经处理了
                // 这里再出现的话就算是语义错误了
                throw Error("没有动作的节点");
            }

            if (child_ast.op === "assign") {
                // assign 节点的 body 中有两个子 ast 元素
                // 第一个是 type 为 target 的元素 表示要赋值到的元素
                // 第二个是一个 epxr 或是一个 func call  需要递归解析它

                const assign_target = child_ast.body[0];
                const assign_value = child_ast.body[1];

                // @ts-ignore
                if (assign_target.type !== "target") {
                    throw Error("assign 节点的目标不是一个 target");
                }

                // @ts-ignore
                const assign_target_label_info = labels_table.find(label => label.id === assign_target.body[0]);

                if (assign_target_label_info === undefined) {
                    throw Error("找不到目标在符号表中的信息");
                }

                // @ts-ignore
                const assign_value_type = expr_checker(assign_value, labels_table, assign_target_label_info.type);

                if (assign_value_type !== assign_target_label_info.type) {
                    throw Error("语义错误 表达式值的类型和目标值的类型不一致");
                }

                continue ; 
            }

            if (child_ast.op === "if") {
                // if 的 ast 中  第一个元素应该是一个 expr  是 if 的判断条件
                // 第二个元素应该是一个 Program  表示条件成立时执行的代码
                // 第三个元素也是一个 Program 但只是有可能有 表示条件不成立时执行的代码

                if (child_ast.body.length < 2) {
                    throw Error("语义错误  if ast 中元素数量不对");
                }

                const if_cond_ast = child_ast.body[0];
                const if_true_ast = child_ast.body[1];
                let if_else_ast = null;

                if (child_ast.body.length === 3) {
                    if_else_ast = child_ast.body[2];
                }

                if (
                    typeof if_cond_ast === "string" || typeof if_cond_ast === "number"
                    || typeof if_true_ast === "string" || typeof if_true_ast === "number"
                ) {
                    throw Error("语义错误  if 的条件或 if 成立时的 ast 不应该是一个 string 或 number");
                }

                // 检查 expr
                expr_checker(if_cond_ast, labels_table, "num");

                // 递归处理 if 成立时的代码块
                if (if_true_ast.type !== "program") {
                    throw Error("语义错误  if 成立时的 ast 不应该是一个除 program 外的其他 ast");
                }

                ast_node_stack.push(child_ast);
                semanticer(if_true_ast, labels_table);
                ast_node_stack.pop();

                // 如果 else 块存在的话 则处理 else 中的代码
                if (if_else_ast !== null) {
                    if (typeof if_else_ast === "string" || typeof if_else_ast === "number") {
                        throw Error("语义错误  if 不成立时的 ast 不应该是一个 string 或 number");
                    }

                    if (if_else_ast.type !== "program") {
                        throw Error("语义错误  if 成立时的 ast 不应该是一个除 program 外的其他 ast");
                    }
    
                    ast_node_stack.push(child_ast);
                    semanticer(if_else_ast, labels_table);
                    ast_node_stack.pop();
                }

                continue ;
            }

            if (child_ast.op === "while") {
                // while 的 ast 中  第一个元素应该是一个 expr  是 while 的判断条件
                // 第二个元素应该是一个 Program  表示条件成立时执行的代码

                if (child_ast.body.length < 2) {
                    throw Error("语义错误  while ast 中元素数量不对");
                }

                const while_cond_ast = child_ast.body[0];
                const while_body_ast = child_ast.body[1];

                if (
                    typeof while_cond_ast === "string" || typeof while_cond_ast === "number"
                    || typeof while_body_ast === "string" || typeof while_body_ast === "number"
                ) {
                    throw Error("语义错误  if 的条件或 if 成立时的 ast 不应该是一个 string 或 number");
                }

                // 检查 expr
                expr_checker(while_cond_ast, labels_table, "num");

                // 递归处理 while 成立时的代码块
                if (while_body_ast.type !== "program") {
                    throw Error("语义错误  if 成立时的 ast 不应该是一个除 program 外的其他 ast");
                }

                ast_node_stack.push(child_ast);
                semanticer(while_body_ast, labels_table);
                ast_node_stack.pop();

                continue ;
            }

            if (child_ast.op === "break" || child_ast.op === "continue") {
                // break 和 continue 只能在 while 中使用

                let in_while = false;

                for (let i = ast_node_stack.length - 1; i >= 0; i--) {
                    const scope = ast_node_stack[i];

                    if (scope.op === "while") {
                        in_while = true;
                        break;
                    }
                }

                if (in_while) {
                    continue ;
                } else {
                    throw Error("语义错误  continue 或 break 只能在循环中使用");
                }
            }

            if (child_ast.op === "return") {
                // return 只能在 fn 中使用
                // return 最多可以有一个子 expr ast  表示返回值

                let in_fn = false;

                /** @type {AST_T | null} */
                let fn_ast = null;

                for (let i = ast_node_stack.length - 1; i >= 0; i--) {
                    const scope_ast = ast_node_stack[i];

                    if (scope_ast.type === "function") {
                        in_fn = true;
                        fn_ast = scope_ast;
                        break;
                    }
                }

                if (!in_fn) {
                    throw Error("语义错误  return 只能在 fn 中使用");
                }

                // 检查 return 的返回值
                if (child_ast.body.length !== 0) {
                    if (child_ast.body.length <= 1) {
                        // 获取到函数应有的返回值的类型
                        if (fn_ast === null) {
                            throw Error("语义错误  意外地没能找到目标函数的 ast");
                        }

                        // @ts-ignore
                        expr_checker(child_ast.body[0], labels_table, fn_ast.body[1].body[0]);
                    } else {
                        throw Error("语义错误  return 只能有一个返回值");
                    }
                }
            }
        }

        if (child_ast.type === "function") {
            // function 的 ast 中  第一个元素应该是函数名的信息
            // 第二个元素应该是函数的返回值信息
            // 最后一个元素是 Program 元素 表示函数体
            // 第三个元素到最后一个元素之间的元素是参数信息

            // @ts-ignore
            const target_label_info = labels_table.find(label => label.id === child_ast.body[0].body[0]);

            if (target_label_info === undefined) {
                throw Error("语义错误  无法在符号表中查得此函数的信息");
            }

            if (target_label_info.type !== "fn") {
                throw Error("语义错误  label 不表示一个 fn");
            }

            // @ts-ignore
            if (child_ast.body[1].type !== "type") {
                throw Error("语义错误  fn 没有返回值类型");
            }

            if (child_ast.body.length > 3) {
                // 说明至少有 4 个子 ast  也即函数至少有一个参数
                // 每个 ast 都应该是一个 target

                for (let i=2; i < child_ast.body.length-1; i++) {
                    const param_ast = child_ast.body[i];

                    if (typeof param_ast === "string" || typeof param_ast === "number") {
                        throw Error("语义错误  fn 的参数 ast 不应该是一个 string 或 number");
                    }

                    if (param_ast.type !== "target") {
                        throw Error("语义错误  fn 的参数 ast 应该是一个 target");
                    }
                }
            }

            ast_node_stack.push(child_ast);
            // 递归解析函数体
            // @ts-ignore
            semanticer(child_ast.body[child_ast.body.length - 1], labels_table);
            ast_node_stack.pop();
        }
    }
};


/**
 * 语义分析器函数
 * @param { AST_T } ast 
 * @param { LABEL_T[] } labels_table 
 */
export default (ast, labels_table) => {
    ast_node_stack.push(ast);

    semanticer(ast, labels_table);

    ast_node_stack.pop();
};
