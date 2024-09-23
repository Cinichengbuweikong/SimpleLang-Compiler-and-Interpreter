/**
 * @module vm  运行字节码的虚拟机函数
 */


/**
 * 将 code_generator 中的类型定义复制到此处
 * @typedef { "load_name" | "load_value" | "load_const" | "assign" | "add" | "sub" | "mul" | "div" | "compare_above" | "compare_above_equal" | "compare_below" | "compare_below_equal" | "compare_equal" | "compare_not_equal" | "jmp" | "jmp_remove" | "jmp_true_remove" | "jmp_false_remove" | "call" | "ret" | "create_scope" | "delete_scope" | "nop" | "seek" } OPT
 * 
 * @typedef {{
 *  action: OPT,
 *  value: any
 * }} OPCodeT
 */


const builtins_functions = {
    // @ts-ignore
    "print": (...args) => {
        console.log(...args);
        // 遵守约定  我们规定函数需要返回一个 str 或 num 类型数值 这里就设置 print 返回一个 0
        return 0;
    },
};


/**
 * 虚拟机函数
 * @param {{
 *  code: OPCodeT[],
 *  function_map: { [props: string]: number },
 *  call_stack: number[],
 *  op_stack: any[],
 *  scope_stack: { [props: string]: any }[]
 * }} code_object  code_generator 生成的代码对象
 */
const vm = (code_object) => {
    const { code, function_map, call_stack, op_stack, scope_stack } = code_object;

    // 一上来代码就应该有一个全局作用域
    scope_stack.push({});

    // 指示当前正在执行的命令的下标
    let ip = 0;

    while (ip !== code.length) {
        const { action: op_action, value: op_value } = code[ip];

        switch(op_action) {
            case "add": {
                const r2 = op_stack.pop();
                const r1 = op_stack.pop();
                const res = r1+r2;
                op_stack.push(res);

                break;
            }
            case "sub": {
                const r2 = op_stack.pop();
                const r1 = op_stack.pop();
                const res = r1-r2;
                op_stack.push(res);

                break;
            }
            case "mul": {
                const r2 = op_stack.pop();
                const r1 = op_stack.pop();
                const res = r1*r2;
                op_stack.push(res);

                break;
            }
            case "div": {
                const r2 = op_stack.pop();
                const r1 = op_stack.pop();
                const res = r1/r2;
                op_stack.push(res);

                break;
            }
            

            case "load_name": {
                op_stack.push(op_value);

                break;
            }
            case "load_value": {
                const r1 = op_stack.pop();

                let value;

                for (let i=scope_stack.length-1; i>=0; i--) {
                    const scope = scope_stack[i];

                    if (scope[r1] !== undefined) {
                        value = scope[r1];
                        break;
                    }
                }

                op_stack.push(value);

                break;
            }
            case "load_const": {
                op_stack.push(op_value);

                break;
            }
            case "assign": {
                const r2 = op_stack.pop();
                const r1 = op_stack.pop();

                // 如果变量在 scope 中 则变量持有对变量所处 scope 的引用
                // 如果变量不在 scope 中 则保持 null
                let found_at_scope = null;

                for (let i=op_stack.length-1; i>=0; i--) {
                    const scope = op_stack[i];

                    if (scope[r1] !== undefined) {
                        found_at_scope = scope;
                        break;
                    }
                }

                if (found_at_scope !== null) {
                    found_at_scope[r1] = r2;
                } else {
                    scope_stack[scope_stack.length - 1][r1] = r2;
                }

                break;
            }
            

            case "compare_above": {
                const r2 = op_stack.pop();
                const r1 = op_stack.pop();

                let value;

                if (r1 > r2) {
                    value = 1;
                } else {
                    value = 0;
                }

                op_stack.push(value);

                break ;
            }
            case "compare_above_equal": {
                const r2 = op_stack.pop();
                const r1 = op_stack.pop();

                let value;

                if (r1 >= r2) {
                    value = 1;
                } else {
                    value = 0;
                }

                op_stack.push(value);

                break ;
            }
            case "compare_below": {
                const r2 = op_stack.pop();
                const r1 = op_stack.pop();

                let value;

                if (r1 < r2) {
                    value = 1;
                } else {
                    value = 0;
                }

                op_stack.push(value);

                break ;
            }
            case "compare_below_equal": {
                const r2 = op_stack.pop();
                const r1 = op_stack.pop();

                let value;

                if (r1 <= r2) {
                    value = 1;
                } else {
                    value = 0;
                }

                op_stack.push(value);

                break ;
            }
            case "compare_equal": {
                const r2 = op_stack.pop();
                const r1 = op_stack.pop();

                let value;

                if (r1 === r2) {
                    value = 1;
                } else {
                    value = 0;
                }

                op_stack.push(value);

                break ;
            }
            case "compare_not_equal": {
                const r2 = op_stack.pop();
                const r1 = op_stack.pop();

                let value;

                if (r1 !== r2) {
                    value = 1;
                } else {
                    value = 0;
                }

                op_stack.push(value);

                break ;
            }


            case "jmp": {
                ip += op_value;
                continue ;
            }
            case "jmp_remove": {
                ip += op_value;
                op_stack.pop();
                continue ;
            }
            case "jmp_true_remove": {
                const r1 = op_stack[op_stack.length - 1];

                if (r1 === 1) {
                    ip += op_value;
                    op_stack.pop();

                    continue ;
                }

                break ;
            }
            case "jmp_false_remove": {
                const r1 = op_stack[op_stack.length - 1];

                if (r1 === 0) {
                    ip += op_value;
                    op_stack.pop();

                    continue ;
                }

                break ;
            }


            case "call": {
                // @ts-ignore
                if (builtins_functions[op_value] !== undefined) {
                    // @ts-ignore
                    const func = builtins_functions[op_value];

                    // 搜集所有参数
                    const scope_vars_name = Object.keys(scope_stack[scope_stack.length - 1]);

                    const func_args_map = {};
                    
                    // 找出以 arg_ 开头的变量
                    scope_vars_name.forEach(scope_var_name => {
                        if (scope_var_name.startsWith("arg_")) {
                            const arg_index = +scope_var_name.split("_")[1];

                            // @ts-ignore
                            func_args_map[arg_index] = scope_stack[scope_stack.length - 1][scope_var_name];
                        }
                    });

                    const func_args_map_keys = Object.keys(func_args_map).map(k => +k).sort();

                    const func_args = [];

                    for (let key of func_args_map_keys) {
                        // @ts-ignore
                        func_args.push(func_args_map[key]);
                    }

                    const res = func(...func_args);

                    op_stack.push(res);

                    break ;
                } else {
                    // 首先查询出函数所在位置
                    const fn_addr = function_map[op_value];

                    // 把函数返回的地址 push 到 call_stack 中
                    // 这里要取当前指令 +1  因为不要跳转回 call 上 会导致死循环
                    call_stack.push(ip + 1);

                    ip = fn_addr;

                    continue ;
                }
            }
            case "ret": {
                const target_addr = call_stack.pop();
                // @ts-ignore
                ip = target_addr;

                continue ;
            }
            case "create_scope": {
                scope_stack.push({});

                break ;
            }
            case "delete_scope": {
                scope_stack.pop();

                break ;
            }
            case "seek": {
                for (let i=0; i<op_value; i++) {
                    op_stack.pop();
                }

                break ;
            }


            case "nop": {
                // 啥都不干
                break ;
            }
        }

        ip += 1;
    }
};


export default vm;
