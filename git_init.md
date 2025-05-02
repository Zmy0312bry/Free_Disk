设置稀疏检出模式

```cmd
git config core.sparseCheckout true
```

```cmd
# 执行初始化并设置成非cone模式
git sparse-checkout set --no-cone
```
检查：
1. 检查.git下config中有无
```txt
[core]
    sparseCheckout = true
```
2. .git/info/下有无sparse-checkout文件

3. sparse-checkout文件内容格式应该如下：
```txt
${target_floder}
!/*
```

更新完后，执行
```cmd
git sparse-checkout reapply
```