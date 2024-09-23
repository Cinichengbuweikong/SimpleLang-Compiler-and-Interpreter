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
