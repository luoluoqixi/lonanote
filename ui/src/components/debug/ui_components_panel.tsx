import {
  Backpack,
  Calendar,
  Check,
  ChevronRight,
  FilePlus,
  RefreshCw,
  Trash2,
} from "@tamagui/lucide-icons-2";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import {
  Accordion,
  AlertDialog,
  Avatar,
  Button,
  Card,
  Checkbox,
  Dialog,
  Input,
  Label,
  Menu,
  Popover,
  RadioGroup,
  Select,
  Separator,
  Slider,
  Spinner,
  Switch,
  Tabs,
  Text,
  TextArea,
  ToggleGroup,
} from "@/components/ui";

type SectionCardProps = {
  children: ReactNode;
  description: string;
  title: string;
};

function SectionCard({ children, description, title }: SectionCardProps) {
  return (
    <Card description={description} style={styles.card} title={title}>
      <View style={styles.sectionBody}>{children}</View>
    </Card>
  );
}

function DemoRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function UiComponentsDebugPanel() {
  const [checkboxValue, setCheckboxValue] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState("lonanote");
  const [menuAction, setMenuAction] = useState("尚未选择");
  const [menuMarkAsRead, setMenuMarkAsRead] = useState(true);
  const [menuNativeEnabled, setMenuNativeEnabled] = useState(true);
  const [menuSubOpen, setMenuSubOpen] = useState(false);
  const [radioValue, setRadioValue] = useState("recent");
  const [selectValue, setSelectValue] = useState<string | null>("blue");
  const [sliderValue, setSliderValue] = useState(56);
  const [switchValue, setSwitchValue] = useState(true);
  const [tabsValue, setTabsValue] = useState("preview");
  const [textAreaValue, setTextAreaValue] = useState("这是一段文本区域示例。");
  const [toggleValue, setToggleValue] = useState("bold");

  const selectItems = useMemo(
    () => [
      { label: "蓝色", value: "blue" },
      { label: "绿色", value: "green" },
      { label: "橙色", value: "orange" },
      { label: "粉色", value: "pink" },
      { label: "红色", value: "red" },
      { label: "白色", value: "white" },
      { label: "黑色", value: "black" },
      { label: "紫色", value: "purple" },
      { label: "黄色", value: "yellow" },
      { label: "灰色", value: "gray" },
      { label: "棕色", value: "brown" },
      { label: "青色", value: "cyan" },
      { label: "靛色", value: "indigo" },
      { label: "金色", value: "gold" },
      { label: "银色", value: "silver" },
    ],
    [],
  );

  return (
    <View style={styles.root}>
      <SectionCard description="按钮、状态切换和加载反馈。" title="动作与反馈">
        <DemoRow>
          <Button>Primary</Button>
          <Button variant="outlined">Outlined</Button>
          <Button disabled>Disabled</Button>
          <Spinner />
        </DemoRow>

        <DemoRow>
          <Switch
            checked={switchValue}
            label="Switch"
            labelPosition="end"
            onCheckedChange={setSwitchValue}
          />
          <Checkbox
            checked={checkboxValue}
            label="Checkbox"
            onCheckedChange={(checked) => setCheckboxValue(checked === true)}
          />
          <ToggleGroup
            items={[
              { label: "B", value: "bold" },
              { label: "I", value: "italic" },
            ]}
            onValueChange={setToggleValue}
            type="single"
            value={toggleValue}
          />
        </DemoRow>
      </SectionCard>

      <SectionCard description="文本输入、多行输入、选择器和滑杆。" title="输入与选择">
        <View style={styles.fieldGroup}>
          <View style={styles.field}>
            <Label>Input</Label>
            <Input onChangeText={setInputValue} placeholder="account" value={inputValue} />
          </View>
          <View style={styles.field}>
            <Label>TextArea</Label>
            <TextArea
              onChangeText={setTextAreaValue}
              placeholder="输入备注"
              rows={4}
              value={textAreaValue}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.field}>
            <Label>Select</Label>
            <Select
              items={selectItems}
              onValueChange={setSelectValue}
              placeholder="选择主题色"
              value={selectValue ?? undefined}
            />
            <Text color="$color10">当前主题色：{selectValue ?? "未选择"}</Text>
          </View>
          <View style={styles.field}>
            <Label>Select Native</Label>
            <Select
              items={selectItems}
              onValueChange={setSelectValue}
              placeholder="选择主题色"
              value={selectValue ?? undefined}
              native
            />
            <Text color="$color10">当前主题色：{selectValue ?? "未选择"}</Text>
          </View>
          <View style={styles.field}>
            <Label>Slider</Label>
            <Slider
              max={100}
              min={0}
              onValueChange={(nextValue: number[]) => setSliderValue(nextValue[0] ?? 0)}
              value={[sliderValue]}
            />
            <Text color="$color10">当前值：{sliderValue}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard
        description="使用 wrapper 默认组合 API，不在业务层手动拼内部结构。"
        title="组合控件"
      >
        <RadioGroup
          items={[
            { label: "最近更新", value: "recent" },
            { label: "按名称", value: "name" },
            { label: "按大小", value: "size" },
          ]}
          onValueChange={setRadioValue}
          value={radioValue}
        />

        <Tabs
          items={[
            {
              content: <Text>当前选中的 tab 是 {tabsValue}</Text>,
              label: "预览",
              value: "preview",
            },
            {
              content: <Text>Tabs 默认 API 负责生成 List、Trigger 和 Content。</Text>,
              label: "说明",
              value: "notes",
            },
          ]}
          onValueChange={setTabsValue}
          value={tabsValue}
        />

        <Accordion
          items={[
            {
              content: <Text>Accordion 默认 API 负责生成 Item、Header、Trigger 和 Content。</Text>,
              title: "展开面板",
              value: "panel",
            },
          ]}
          type="single"
        />
      </SectionCard>

      <SectionCard
        description="弹层类组件支持简单入口；Menu 额外展示官方风格的复合 API 和多层子菜单。"
        title="浮层与菜单"
      >
        <DemoRow>
          <Dialog
            onOpenChange={setDialogOpen}
            open={dialogOpen}
            title="Dialog 标题"
            trigger={<Button onPress={() => setDialogOpen(true)}>打开 Dialog</Button>}
          >
            <Text>这是 Dialog 内容区域。</Text>
          </Dialog>

          <AlertDialog
            cancelLabel="取消"
            destructiveLabel="删除"
            description="这个操作无法撤销，仅用于展示组件结构。"
            onOpenChange={setAlertDialogOpen}
            open={alertDialogOpen}
            title="删除确认"
            trigger={<Button onPress={() => setAlertDialogOpen(true)}>打开 AlertDialog</Button>}
          />

          <Popover
            arrow
            content={<Text>这里可放任意说明或操作。</Text>}
            trigger={<Button variant="outlined">打开 Popover</Button>}
          />

          <Menu>
            <Menu.Trigger>
              <Button icon={Backpack} size="$4" variant="outlined">
                打开 Menu
              </Button>
            </Menu.Trigger>

            <Menu.Portal zIndex={100}>
              <Menu.Content>
                <Menu.Arrow />

                <Menu.ScrollView>
                  <Menu.Item key="about-notes" onSelect={() => setMenuAction("关于笔记")}>
                    <Menu.ItemTitle>关于笔记</Menu.ItemTitle>
                  </Menu.Item>

                  <Menu.Separator />

                  <Menu.Item key="settings" onSelect={() => setMenuAction("设置")}>
                    <Menu.ItemTitle>设置</Menu.ItemTitle>
                  </Menu.Item>
                  <Menu.Item
                    justify="space-between"
                    key="calendar"
                    onSelect={() => setMenuAction("日历")}
                    textValue="日历"
                  >
                    <Menu.ItemTitle>日历</Menu.ItemTitle>
                    <Menu.ItemIcon>
                      <Calendar color="$color10" size={14} />
                    </Menu.ItemIcon>
                  </Menu.Item>

                  <Menu.Separator />

                  <Menu.Item disabled key="locked-notes">
                    <Menu.ItemTitle color="$color10">锁定笔记</Menu.ItemTitle>
                  </Menu.Item>
                  <Menu.Item
                    destructive
                    key="delete-all"
                    onSelect={() => setMenuAction("删除全部")}
                  >
                    <Menu.ItemTitle color="$red10">删除全部</Menu.ItemTitle>
                  </Menu.Item>

                  <Menu.Separator />

                  <Menu.Sub onOpenChange={setMenuSubOpen} open={menuSubOpen}>
                    <Menu.SubTrigger justify="space-between" key="actions-trigger" textValue="操作">
                      <Menu.ItemTitle>操作</Menu.ItemTitle>
                      <ChevronRight color="$color10" size={16} />
                    </Menu.SubTrigger>

                    <Menu.Portal zIndex={200}>
                      <Menu.SubContent>
                        <Menu.Label>笔记设置</Menu.Label>
                        <Menu.Item
                          justify="space-between"
                          key="create-note"
                          onSelect={() => setMenuAction("新建笔记")}
                          textValue="新建笔记"
                        >
                          <Menu.ItemTitle>新建笔记</Menu.ItemTitle>
                          <Menu.ItemIcon>
                            <FilePlus color="$color10" size={14} />
                          </Menu.ItemIcon>
                        </Menu.Item>
                        <Menu.Item
                          justify="space-between"
                          key="delete-all-notes"
                          onSelect={() => setMenuAction("删除所有笔记")}
                          textValue="删除所有笔记"
                        >
                          <Menu.ItemTitle>删除所有笔记</Menu.ItemTitle>
                          <Menu.ItemIcon>
                            <Trash2 color="$color10" size={14} />
                          </Menu.ItemIcon>
                        </Menu.Item>
                        <Menu.Item
                          justify="space-between"
                          key="sync-notes"
                          onSelect={() => setMenuAction("同步笔记")}
                          textValue="同步笔记"
                        >
                          <Menu.ItemTitle>同步笔记</Menu.ItemTitle>
                          <Menu.ItemIcon>
                            <RefreshCw color="$color10" size={14} />
                          </Menu.ItemIcon>
                        </Menu.Item>
                      </Menu.SubContent>
                    </Menu.Portal>
                  </Menu.Sub>

                  <Menu.Separator />

                  <Menu.CheckboxItem
                    checked={menuMarkAsRead}
                    justify="space-between"
                    key="mark-as-read"
                    onCheckedChange={setMenuMarkAsRead}
                    onSelect={() => setMenuAction(menuMarkAsRead ? "取消标记已读" : "标记为已读")}
                    textValue="标记为已读"
                  >
                    <Menu.ItemTitle>标记为已读</Menu.ItemTitle>
                    <Menu.ItemIndicator>
                      <Check color="$color10" size={12} />
                    </Menu.ItemIndicator>
                  </Menu.CheckboxItem>
                  <Menu.CheckboxItem
                    checked={menuNativeEnabled}
                    justify="space-between"
                    key="enable-native"
                    onCheckedChange={setMenuNativeEnabled}
                    onSelect={() =>
                      setMenuAction(menuNativeEnabled ? "关闭 Native 菜单" : "启用 Native 菜单")
                    }
                    textValue="启用 Native 菜单"
                  >
                    <Menu.ItemTitle>启用 Native 菜单</Menu.ItemTitle>
                    <Menu.ItemIndicator>
                      <Check color="$color10" size={12} />
                    </Menu.ItemIndicator>
                  </Menu.CheckboxItem>
                </Menu.ScrollView>
              </Menu.Content>
            </Menu.Portal>
          </Menu>
        </DemoRow>
        <Text color="$color10">最近菜单动作：{menuAction}</Text>
      </SectionCard>

      <SectionCard description="头像、文本、分隔线和卡片默认结构。" title="展示组件">
        <DemoRow>
          <Avatar fallback="LN" size="$4" />
          <View style={styles.textDemo}>
            <Text fontSize="$5" fontWeight="600">
              Text 组件示例
            </Text>
            <Text color="$color10">这里展示标题、正文和说明文案的基础排版。</Text>
          </View>
        </DemoRow>
        <Separator />
        <Card description="Card 默认 API 可直接传 title 和 description。" title="Card 组件示例">
          <Text>这里是 Card 承载的正文内容。</Text>
        </Card>
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
  },
  field: {
    flex: 1,
    gap: 8,
    minWidth: 280,
  },
  fieldGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  root: {
    gap: 20,
    paddingBottom: 12,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  sectionBody: {
    gap: 16,
    padding: 16,
    paddingTop: 0,
  },
  textDemo: {
    flex: 1,
    gap: 4,
    minWidth: 220,
  },
});
