<img width="80" height="80" alt="Image" src="https://neovim.io/logos/neovim-mark-flat.png" />
<img width="800" height="800" alt="Image" src="https://github.com/user-attachments/assets/0d053477-0350-4d29-a965-c8743a631ba1" >

# 为什么选择neovim
~~当然是为了装杯啦!~~
- 相对来说neovim的配置肯定是更加复杂的，但也更加客制化。
- 体验新鲜感，为无聊的生活增加乐趣。

# neovim的安装
想linux系统一样，neovim有很多“发行版”，比如lazyvim、astrovim等。
这里我以astrovim为例（因为我自己用的就是它）：

## ⚡安装依赖
- 你需要一个[Nerd Fonts](https://www.nerdfonts.com/font-downloads)，下载压缩包后解压缩，全选右键点安装字体。不要忘了在终端里选择安装的Nerd Font字体哦！
- 安装[neovim(v0.10+)](https://github.com/neovim/neovim/releases/tag/stable)
- 可选（但为了体验完整最好全部安装上，不然会有些功能无法使用）:
    - ripgrep - live grep file search (<Leader>fw)
    - lazygit - git ui toggle terminal (<Leader>tl or <Leader>gg)
    - go DiskUsage() - disk usage toggle terminal (<Leader>tu)
    - bottom - process viewer toggle terminal (<Leader>tt)
    - Python - python repl toggle terminal (<Leader>tp)
    - Node - Node is needed for a lot of the LSPs, and for the node repl toggle terminal (<Leader>tn)

## 🧰正式安装
### Linux/Macos
- 备份你之前的配置（如果第一次配置就不需要做这一步）
```shell
mv ~/.config/nvim ~/.config/nvim.bak
mv ~/.local/share/nvim ~/.local/share/nvim.bak
mv ~/.local/state/nvim ~/.local/state/nvim.bak
mv ~/.cache/nvim ~/.cache/nvim.bak
```
- 安装astrovim
```shell
git clone --depth 1 https://github.com/AstroNvim/template ~/.config/nvim
rm -rf ~/.config/nvim/.git
```
- astrovim，启动！
```shell
nvim
```

### Windows
- 备份你之前的配置（如果第一次配置就不需要做这一步）
```shell
Move-Item $env:LOCALAPPDATA\nvim $env:LOCALAPPDATA\nvim.bak
Move-Item $env:LOCALAPPDATA\nvim-data $env:LOCALAPPDATA\nvim-data.bak
```
- 安装astrovim
```shell
git clone --depth 1 https://github.com/AstroNvim/template $env:LOCALAPPDATA\nvim
Remove-Item $env:LOCALAPPDATA\nvim\.git -Recurse -Force
```
- astrovim，启动！
```shell
nvim
```

# 结语
以上就是neovim的配置安装，之后我会记录如何使用neovim进行日常的开发，谢谢观看！