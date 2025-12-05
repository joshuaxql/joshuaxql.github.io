## 完整的LC3代码
```asm
            .ORIG x3000
MAIN        LDI R1, N               ; 从x3100加载N到R1
            ADD R0, R1, #-2        ; 检查N是否小于等于2
            BRnz BASE_CASE         ; 如果是，跳转到基本情况
            
            ; 初始化数组
            LEA R2, Q_ARRAY        ; R2指向Q数组
            AND R0, R0, #0
            ADD R0, R0, #1         ; R0 = 1
            STR R0, R2, #0         ; Q[1] = 1
            STR R0, R2, #1         ; Q[2] = 1
            
            ; 开始计算Q(3)到Q(N)
            AND R3, R3, #0
            ADD R3, R3, #3         ; R3 = i = 3
            
LOOP        NOT R4, R3
            ADD R4, R4, #1         ; R4 = -i
            ADD R4, R1, R4         ; R4 = N - i
            BRn END_LOOP           ; 如果i > N，结束循环
            
            ; 计算i - Q(i-1)
            ADD R4, R3, #-1        ; R4 = i-1
            ADD R4, R4, R2         ; R4指向Q[i-1]
            LDR R5, R4, #-1         ; R5 = Q(i-1)
            NOT R5, R5
            ADD R5, R5, #1         ; R5 = -Q(i-1)
            ADD R4, R3, R5         ; R4 = i - Q(i-1) = index1
            
            ; 获取Q(index1)
            ADD R5, R4, R2         ; R5指向Q[index1]
            LDR R5, R5, #-1        ; R5 = Q[index1] (数组索引从0开始)
            
            ; 计算i - Q(i-2)
            ADD R4, R3, #-2        ; R4 = i-2
            ADD R4, R4, R2         ; R4指向Q[i-2]
            LDR R6, R4, #-1         ; R6 = Q(i-2)
            NOT R6, R6
            ADD R6, R6, #1         ; R6 = -Q(i-2)
            ADD R4, R3, R6         ; R4 = i - Q(i-2) = index2
            
            ; 获取Q(index2)
            ADD R6, R4, R2         ; R6指向Q[index2]
            LDR R6, R6, #-1        ; R6 = Q[index2]
            
            ; 计算Q(i) = Q(index1) + Q(index2)
            ADD R5, R5, R6         ; R5 = Q(i)
            
            ; 存储Q(i)
            ADD R4, R3, #-1        ; R4 = i-1 (数组索引)
            ADD R4, R4, R2         ; R4指向Q[i]
            STR R5, R4, #0         ; 存储Q(i)
            
            ; 检查是否达到N
            NOT R4, R3
            ADD R4, R4, #1         ; R4 = -i
            ADD R4, R1, R4         ; R4 = N - i
            BRnp NEXT_ITER         ; 如果i != N，继续循环
            
            ; i == N，保存结果到R7
            ADD R7, R5, #0         ; R7 = Q(N)
            
NEXT_ITER   ADD R3, R3, #1         ; i = i + 1
            BR LOOP
            
END_LOOP    ; 将结果存储到x3101
            LD R0, RESULT_ADDR
            STR R7, R0, #0
            HALT

BASE_CASE   ; 基本情况：N=1或2时，Q(N)=1
            LD R0, RESULT_ADDR
            AND R1, R1, #0
            ADD R1, R1, #1
            STR R1, R0, #0         ; 存储1到x3101
            HALT

N           .FILL x3100           ; 输入N的地址
RESULT_ADDR .FILL x3101           ; 输出结果的地址
Q_ARRAY     .BLKW 100             ; Q数组，存储Q[1]到Q[100]

            .END
```
## 关于代码的分析
### 1 程序结构
我的实现遵循参考方法，包含以下关键部分：

1. **内存组织：**
   - 输入 `N` 存储在内存地址 `x3100`
   - 输出 `Q(N)` 存储在内存地址 `x3101`
   - 数组 `Q[1..100]` 在程序末尾分配（使用 `.BLKW 100`）

2. **主要算法：**
   - 检查基本情况：如果 `N ≤ 2`，返回 `Q(N) = 1`
   - 初始化 `Q[1] = 1` 和 `Q[2] = 1`
   - 对于 `i = 3` 到 `N`：
     - 计算 `index1 = i - Q(i-1)`
     - 计算 `index2 = i - Q(i-2)`
     - 设置 `Q(i) = Q(index1) + Q(index2)`
   - 将 `Q(N)` 存储到 `x3101`

### 2 使用的寻址模式
- **PC相对寻址：** 用于加载常量和标签（如 `LD R1, N`）
- **基址+偏移寻址：** 用于使用 `LEA` 和偏移量访问数组
- **间接寻址：** 用于访问 `x3100` 和 `x3101` 处的内存位置

### 3 内存管理
Q数组使用100个连续的内存字来模拟。每个元素 `Q[i]` 使用从0开始的索引访问：`address = Q_ARRAY + (i-1)`。程序使用寄存器保存区域来保护寄存器值。