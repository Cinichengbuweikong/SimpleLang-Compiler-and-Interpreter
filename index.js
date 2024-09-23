// @ts-nocheck

import { readFile } from "node:fs";
import { promisify } from "node:util";

import pre_process from "./pre_preocess.js";
import lexer from "./lexer.js";
import parser from "./parser.js";
import semanticer from "./semanticer.js";
import code_generator from "./code-generator.js";
import vm from "./vm.js";


const async_read_file = promisify(readFile);


/**
 * 读取源代码文件
 * @type {string}
 */
const code_str = (await async_read_file("./test_main.sl")).toString();

// 预处理
const processed_code_str = pre_process(code_str);

// 词法分析
const tokens = lexer(processed_code_str);

// 语法分析
const { ast, labels_table } = parser(tokens);

// 语义分析
semanticer(ast, labels_table);

// 代码生成
const code = code_generator(ast, labels_table);

// 最后 运行代码
vm(code);
