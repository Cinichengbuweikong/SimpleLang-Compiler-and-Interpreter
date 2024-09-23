num fn s(num current) {
    num subpart = 0;

    if (current != 0) {
        subpart = s(current - 1);
    }

    return current + subpart;  // 一个函数只能有一个 return  很怪! 但懒得修理了
}

num r = s(10);
print(r);  // 55
