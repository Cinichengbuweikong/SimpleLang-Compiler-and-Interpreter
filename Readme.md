# SimpleLang Compiler & Interpreter

我发明了一门语言 它很简单 所以我们就叫它 SimpleLang

语法如下:

```sl
num a = 5;
str b = "hello";

num fn f(num t, str j) {
    num i = 0;

    while (i<t) {
        if (i == 3) {
            print("i eq 3");

            i = i + 1;
            continue;
        }

        if (i == 4) {
            break;
        }

        print(i, j);

        i = i + 1;
    }

    return 0;
}

num res = f(a, b);  // 1 hello  2 hello  i eq 3
print(res);  // 0
```

本语言既有编译的部分也有解释的部分  具体实现是吧源码编译为适用于 SimpleLang 虚拟机的机器码 再编写 SimpleLang 虚拟机运行编译出的机器码



我使用 JavaScript 编写了这门语言的编译器 & 虚拟机 就把这个项目当作我学习编译原理的一个成果吧！

本语言实现了如下编译器 & 解释器的功能:

- 词法分析
- 语法分析
- 语义分析
- 代码生成
- 虚拟机设计

但每个部分都很羸弱就是了 :)



编译原理相关的知识 学习自:

- https://github.com/Captainarash/CaptCC
- https://github.com/starkwang/the-super-tiny-compiler-cn
- https://zhuanlan.zhihu.com/p/21830284

可以看看它们



如果你想试试的话 只需要把代码 clone 下来 然后运行 index.js 即可 但这要你的设备拥有 Node.js 的环境

如果对你有帮助 荣幸之至！































