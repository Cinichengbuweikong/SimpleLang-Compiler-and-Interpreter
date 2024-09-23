/**
 * @module preprocess
 */


/**
 * @param {string} codeStr
 * @returns {string} 
 */
function pre_process(codeStr) {
    // 在预处理函数中 我们需要把字符串中的所有注释部分全部删除


    // 先把代码分割为一行一行的
    let tmpCharList = [];  // 存储临时字符的数组
    const lines = [];  // 每行代码
    let i = 0;

    while (i < codeStr.length - 1) {
        const iC = codeStr[i];
        const iC1 = codeStr[i+1];

        if (iC === "\n") {
            lines.push(tmpCharList.join(""));
            tmpCharList = [];
        } else if (iC === "\r" && iC1 === "\n") {
            lines.push(tmpCharList.join(""));
            tmpCharList = [];

            i++;  // 当前字符是 \r  这里设置跳过此 \r  后续的 i++ 还会跳过 \n 
        } else {
            // 不是换行 那就存储当前字符
            tmpCharList.push(codeStr[i]);
        }

        i++;
    }

    // 此时 tmpCharList 中还有最后一句代码的字符 不要把它忘了
    // 我们遍历的范围是 0 到 codeStr.length - 1
    // 因此此时 tmpCharList 中没有代码字符串中的最后一个字符
    // 把它添加上
    lines.push(tmpCharList.join("") + codeStr[codeStr.length - 1]);
    tmpCharList = [];


    // 遍历每行代码 删除末尾的注释
    const prrocessedLines = [];

    for (let i=0; i<lines.length; i++) {
        const line = lines[i];

        // 记录注释开始位置
        let commetIndex = -1;

        for (let charIndex=0; charIndex<line.length - 1; charIndex++) {
            const c = line[charIndex];
            const c1 = line[charIndex + 1];

            if (c === "/" && c1 === "/") {
                commetIndex = charIndex;
                break;
            }
        }

        let codeWithoutCommet;

        // 注释在本行中存在 则切分字符串 否则不切分
        if (commetIndex !== -1) {
            codeWithoutCommet = line.substring(0, commetIndex);
        } else {
            codeWithoutCommet = line;
        }

        prrocessedLines.push(codeWithoutCommet);
    }


    // 返回结果的时候记得把换行加上 其实加不加无所谓 但这里就加上了
    return prrocessedLines.join("\n");
}


export default pre_process;
