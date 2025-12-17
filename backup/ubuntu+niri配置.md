# niri是什么
你可以把它理解成你电脑桌面的一个**超级智能、又会炫酷动画的“自动整理大师”**。

## 它到底是个啥？

想象一下：
*   **效率上**，它像那种严格的“整理狂”室友，只要你打开或关闭一个窗口，它马上就把所有窗口自动排列得整整齐齐，一点屏幕空间都不浪费。
*   **体验上**，它又像个酷酷的“动画师”，切换桌面、移动窗口都带着 iPhone 或 macOS 那种丝滑的滚动效果，用触摸板三指一划就能切屏，特别跟手。

简单说，**niri 就是想让你既享受效率，又享受美观和流畅，鱼和熊掌都给你**。

## 有啥厉害的绝活？

1.  **自动摆窗口（动态平铺）**：你只管开软件，它来操心怎么摆。窗口会自动并排、堆叠，充分利用整个屏幕。你关一个，旁边的窗口会自动“补位”。
2.  **丝滑动画**：这是它最出彩的地方！**切换桌面像翻书一样有滚动效果**，窗口弹出和关闭也有过渡，操作起来感觉特别流畅。
3.  **手势和快捷键很聪明**：
    *   触摸板三指横扫，就能在多个桌面之间穿梭。
    *  按个快捷键（比如 `Win + D`），它能进入一个 **“总览模式”**，给所有窗口标上号，你按数字键就能瞬间跳过去，找窗口快如闪电。
4.  **配置不难**：它的设置文件写得挺清楚，改了配置马上生效，不用重启。也能和你喜欢的状态栏（如 waybar）、通知工具完美搭档。

# 效果图
<img width="2560" height="1600" alt="Image" src="https://github.com/user-attachments/assets/34a79291-33ec-4bc9-81ff-242aacde8b3b" />

# 开始配置吧

## 前置条件
* 装有**ubuntu25.04以上**系统的电脑
* 流畅的网络(能连上github)

## 安装步骤

* 自动脚本安装
```bash
curl -fsSL https://install.danklinux.com | sh
```

* 期间选择niri作为桌面，kitty作为终端

* 配置niri，配置文件在~/.config/niri/config.kdl
```C
// This config is in the KDL format: https://kdl.dev
// "/-" comments out the following node.
// Check the wiki for a full description of the configuration:
// https://github.com/YaLTeR/niri/wiki/Configuration:-Introduction
config-notification {
    disable-failed
}

gestures {
    hot-corners {
        off
    }
}

// Input device configuration.
// Find the full list of options on the wiki:
// https://github.com/YaLTeR/niri/wiki/Configuration:-Input
input {
    keyboard {
        xkb {
        }
        numlock
    }
    touchpad {
    }
    mouse {
    }
    trackpoint {
    }
}
// You can configure outputs by their name, which you can find
// by running `niri msg outputs` while inside a niri instance.
// The built-in laptop monitor is usually called "eDP-1".
// Find more information on the wiki:
// https://github.com/YaLTeR/niri/wiki/Configuration:-Outputs
// Remember to uncomment the node by removing "/-"!
/-output "eDP-2" {
    mode "2560x1600@60"
    position x=2560 y=0
    variable-refresh-rate
}
// Settings that influence how windows are positioned and sized.
// Find more information on the wiki:
// https://github.com/YaLTeR/niri/wiki/Configuration:-Layout
layout {
    // Set gaps around windows in logical pixels.
    background-color "transparent"
    // When to center a column when changing focus, options are:
    // - "never", default behavior, focusing an off-screen column will keep at the left
    //   or right edge of the screen.
    // - "always", the focused column will always be centered.
    // - "on-overflow", focusing a column will center it if it doesn't fit
    //   together with the previously focused column.
    center-focused-column "never"
    // You can customize the widths that "switch-preset-column-width" (Mod+R) toggles between.
    preset-column-widths {
        // Proportion sets the width as a fraction of the output width, taking gaps into account.
        // For example, you can perfectly fit four windows sized "proportion 0.25" on an output.
        // The default preset widths are 1/3, 1/2 and 2/3 of the output.
        proportion 0.33333
        proportion 0.5
        proportion 0.66667
        // Fixed sets the width in logical pixels exactly.
        // fixed 1920
    }
    // You can also customize the heights that "switch-preset-window-height" (Mod+Shift+R) toggles between.
    // preset-window-heights { }
    // You can change the default width of the new windows.
    default-column-width { proportion 0.5; }
    // If you leave the brackets empty, the windows themselves will decide their initial width.
    // default-column-width {}
    // By default focus ring and border are rendered as a solid background rectangle
    // behind windows. That is, they will show up through semitransparent windows.
    // This is because windows using client-side decorations can have an arbitrary shape.
    //
    // If you don't like that, you should uncomment `prefer-no-csd` below.
    // Niri will draw focus ring and border *around* windows that agree to omit their
    // client-side decorations.
    //
    // Alternatively, you can override it with a window rule called
    // `draw-border-with-background`.
    border {
        off
        width 4
        active-color   "#707070"      // Neutral gray
        inactive-color "#d0d0d0"      // Light gray
        urgent-color   "#cc4444"      // Softer red
    }
    shadow {
        softness 30
        spread 5
        offset x=0 y=5
        color "#0007"
    }
    struts {
    }
}
layer-rule {
    match namespace="^quickshell$"
    place-within-backdrop true
}
overview {
    workspace-shadow {
        off
    }
}
// Add lines like this to spawn processes at startup.
// Note that running niri as a session supports xdg-desktop-autostart,
// which may be more convenient to use.
// See the binds section below for more spawn examples.
// This line starts waybar, a commonly used bar for Wayland compositors.
environment {
  XDG_CURRENT_DESKTOP "niri"
  LC_MESSAGES "zh_CN.UTF-8"
  GTK_IM_MODULE "fcitx"
  XMODIFIERS "@im=fcitx"
  QT_IM_MODULE "fcitx"
}
spawn-at-startup "bash" "-c" "wl-paste --watch cliphist store &"
spawn-at-startup "fcitx5"
hotkey-overlay {
    skip-at-startup
}
prefer-no-csd
screenshot-path "~/图片/Screenshots/Screenshot from %Y-%m-%d %H-%M-%S.png"
animations {
    workspace-switch {
        spring damping-ratio=0.80 stiffness=523 epsilon=0.0001
    }
    window-open {
        duration-ms 150
        curve "ease-out-expo"
    }
    window-close {
        duration-ms 150
        curve "ease-out-quad"
    }
    horizontal-view-movement {
        spring damping-ratio=0.85 stiffness=423 epsilon=0.0001
    }
    window-movement {
        spring damping-ratio=0.75 stiffness=323 epsilon=0.0001
    }
    window-resize {
        spring damping-ratio=0.85 stiffness=423 epsilon=0.0001
    }
    config-notification-open-close {
        spring damping-ratio=0.65 stiffness=923 epsilon=0.001
    }
    screenshot-ui-open {
        duration-ms 200
        curve "ease-out-quad"
    }
    overview-open-close {
        spring damping-ratio=0.85 stiffness=800 epsilon=0.0001
    }
}
// Window rules let you adjust behavior for individual windows.
// Find more information on the wiki:
// https://github.com/YaLTeR/niri/wiki/Configuration:-Window-Rules
// Work around WezTerm's initial configure bug
// by setting an empty default-column-width.
window-rule {
    // This regular expression is intentionally made as specific as possible,
    // since this is the default config, and we want no false positives.
    // You can get away with just app-id="wezterm" if you want.
    match app-id=r#"^org\.wezfurlong\.wezterm$"#
    default-column-width {}
}
window-rule {
    match app-id=r#"^org\.gnome\."#
    draw-border-with-background false
    geometry-corner-radius 12
    clip-to-geometry true
}
window-rule {
    match app-id=r#"^gnome-control-center$"#
    match app-id=r#"^pavucontrol$"#
    match app-id=r#"^nm-connection-editor$"#
    default-column-width { proportion 0.5; }
    open-floating false
}
window-rule {
    match app-id=r#"^gnome-calculator$"#
    match app-id=r#"^galculator$"#
    match app-id=r#"^blueman-manager$"#
    match app-id=r#"^org\.gnome\.Nautilus$"#
    match app-id=r#"^steam$"#
    match app-id=r#"^xdg-desktop-portal$"#
    open-floating true
}
window-rule {
    match app-id=r#"^org\.wezfurlong\.wezterm$"#
    match app-id="Alacritty"
    match app-id="zen"
    match app-id="com.mitchellh.ghostty"
    match app-id="kitty"
    draw-border-with-background false
}
window-rule {
    //geometry-corner-radius 12
    //clip-to-geometry true
    match is-active=false
    open-fullscreen false
    opacity 0.9
    open-floating false
}
window-rule {
    match app-id=r#"firefox$"# title="^Picture-in-Picture$"
    match app-id="zoom"
    open-floating true
}
// Open dms windows as floating by default
window-rule {
    match app-id=r#"org.quickshell$"#
    open-floating true
}
debug {
    honor-xdg-activation-with-invalid-serial
}

// Override to disable super+tab
recent-windows {
    binds {
        Alt+Tab         { next-window scope="output"; }
        Alt+Shift+Tab   { previous-window scope="output"; }
        Alt+grave       { next-window filter="app-id"; }
        Alt+Shift+grave { previous-window filter="app-id"; }
    }
}

// Include dms files
include "dms/colors.kdl"
include "dms/layout.kdl"
include "dms/alttab.kdl"
include "dms/binds.kdl"
```

* 配置kitty，配置文件在~/.config/kitty/kitty.conf
```C
# Font Configuration
font_size 12.0

# Window Configuration
window_padding_width 12
background_opacity 1.0
background_blur 32
hide_window_decorations yes

# Cursor Configuration
cursor_shape block
cursor_blink_interval 1

# Scrollback
scrollback_lines 3000

# Terminal features
copy_on_select yes
strip_trailing_spaces smart

# Key bindings for common actions
map ctrl+shift+n new_window
map ctrl+t new_tab
map ctrl+plus change_font_size all +1.0
map ctrl+minus change_font_size all -1.0
map ctrl+0 change_font_size all 0

# Tab configuration
tab_bar_style powerline
tab_bar_align left

# Shell integration
shell_integration enabled

# Dank color generation
include dank-tabs.conf
include dank-theme.conf

# Fonts
font_family      JetBrainsMono NFM Regular
bold_font        JetBrainsMono NFM Bold
italic_font      JetBrainsMono NFM Italic
bold_italic_font JetBrainsMono NFM Bold Italic

# Force to use Symbols Nerd Font for Nerd Font symbols
symbol_map             U+23FB-U+23FE,U+2665,U+26A1,U+2B58,U+E000-U+E00A,U+E0A0-U+E0A3,U+E0B0-U+E0D4,U+E200-U+E2A9,U+E300-U+E3E3,U+E5FA-U+E6AA,U+E700-U+E7C5,U+EA60-U+EBEB,U+F000-U+F2E0,U+F300-U+F32F,U+F400-U+F4A9,U+F500-U+F8FF,U+F0001-U+F1AF0 Symbols Nerd Font Mono

# Cursor
cursor_trail 3
```

## 推荐一些应用

* [lxmusic](https://lxmusic.toside.cn/download)
<img width="80" height="80" alt="Image" src="https://raw.githubusercontent.com/lyswhut/lx-music-desktop/master/doc/images/icon.png" />

一款可以免费听歌的软件，可以配置一下音源(推荐去看这篇[博客](https://awaw.cc/post/lx-music-source))

* [clash verge](https://clash-verge.org/zh-CN)
<img width="80" height="80" alt="Image" src="https://raw.githubusercontent.com/clash-verge-rev/clash-verge-rev/dev/src-tauri/icons/icon.png" />

一款可以平替clash for windows的窗口代理软件。

* [libreoffice](https://zh-cn.libreoffice.org/)
<img width="80" height="80" alt="Image" src="https://avatars.githubusercontent.com/u/5824056?s=200&v=4" />

一款可以平替office的办公软件。

## 一些已知问题的解决方案
* snap安装的应用无法使用输入法，应为其应用了沙盒化。解决方案为用apt安装。
* lxmusic启动时没有自动分配大小。解决方案为设置为全屏启动。

# 结语
最后用fastfetch一下，交一下你的作业吧！😄