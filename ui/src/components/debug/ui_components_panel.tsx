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
  ContextMenu,
  Dialog,
  Form,
  Image,
  Input,
  Label,
  Link,
  ListGroup,
  Menu,
  Popover,
  Progress,
  RadioGroup,
  ScrollView,
  Select,
  Separator,
  Sheet,
  Slider,
  Spinner,
  Switch,
  Tabs,
  TamaguiSlider,
  Text,
  TextArea,
  ToggleGroup,
  Tooltip,
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
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [contextMenuAction, setContextMenuAction] = useState("尚未选择");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogOpen2, setDialogOpen2] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertDialogOpen2, setAlertDialogOpen2] = useState(false);
  const [formSubmitCount, setFormSubmitCount] = useState(0);
  const [inputValue, setInputValue] = useState("lonanote");
  const [menuAction, setMenuAction] = useState("尚未选择");
  const [menuMarkAsRead, setMenuMarkAsRead] = useState(true);
  const [menuNativeEnabled, setMenuNativeEnabled] = useState(true);
  const [menuSubOpen, setMenuSubOpen] = useState(false);
  const [radioValue, setRadioValue] = useState("recent");
  const [selectValue, setSelectValue] = useState<string | null>("blue");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPosition, setSheetPosition] = useState(0);
  const [globalSheetOpen, setGlobalSheetOpen] = useState(false);
  const [globalSheetPosition, setGlobalSheetPosition] = useState(0);
  const [globalSnapPointsMode, setGlobalSnapPointsMode] = useState<
    "percent" | "fit" | "mixed" | "constant"
  >("percent");
  const [sliderValue, setSliderValue] = useState(56);
  const [tamaguiSliderValue, setTamaguiSliderValue] = useState(56);
  const [switchValue, setSwitchValue] = useState(true);
  const [tabsValue, setTabsValue] = useState("preview");
  const [textAreaValue, setTextAreaValue] = useState("这是一段文本区域示例。");
  const [toggleValue, setToggleValue] = useState("bold");
  const [popoverName, setPopoverName] = useState("LonaNote");

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

  const sheetItems = useMemo(
    () => ["最近工作区", "主题与外观", "同步状态", "导出设置", "快捷键说明"],
    [],
  );

  const handleSheetOpenChange = (nextOpen: boolean) => {
    setSheetOpen(nextOpen);
  };

  const handleSheetPositionChange = (nextPosition: number) => {
    setSheetPosition(nextPosition);
  };

  const handleGlobalSheetOpenChange = (nextOpen: boolean) => {
    setGlobalSheetOpen(nextOpen);
  };

  const handleGlobalSheetPositionChange = (nextPosition: number) => {
    setGlobalSheetPosition(nextPosition);
  };

  return (
    <View style={styles.root}>
      <SectionCard description="按钮、状态切换和加载反馈。" title="动作与反馈">
        <View style={styles.demoGroup}>
          <Text fontSize="$5" fontWeight="600">
            Button
          </Text>

          <DemoRow>
            <Button chromeless>Plain</Button>
            <Button theme="accent">Active</Button>
            <Button variant="outlined">Outlined</Button>
            <Button disabled>Disabled</Button>
          </DemoRow>

          <DemoRow>
            <Button icon={Calendar}>icon</Button>
            <Button iconAfter={ChevronRight}>iconAfter</Button>
            <Button icon={RefreshCw} theme="green">
              Themed
            </Button>
            <Button circular icon={Check} aria-label="确认" />
            <Button icon={Backpack} iconSize="$2" theme="blue">
              Blue
            </Button>
            <Button iconAfter={Trash2} theme="red">
              Red
            </Button>
          </DemoRow>
        </View>

        <View style={styles.demoGroup}>
          <Text fontSize="$5" fontWeight="600">
            Checkbox
          </Text>

          <View style={styles.checkboxGroup}>
            <Checkbox
              checked={checkboxChecked}
              label="Accept terms and conditions"
              onCheckedChange={(checked) => setCheckboxChecked(checked === true)}
              size="$4"
            />
          </View>
        </View>

        <DemoRow>
          <Spinner />
          <Spinner size="large" color="$yellow10" />
          <Switch
            checked={switchValue}
            label="Switch"
            labelPosition="end"
            onCheckedChange={setSwitchValue}
          />
        </DemoRow>

        <View style={styles.demoGroup}>
          <Text fontSize="$5" fontWeight="600">
            ToggleGroup
          </Text>
          <DemoRow>
            <ToggleGroup
              items={[
                { label: "B", value: "bold" },
                { label: "I", value: "italic" },
                { label: "~", value: "test" },
              ]}
              onValueChange={setToggleValue}
              type="single"
              value={toggleValue}
            />
          </DemoRow>
        </View>

        <View style={styles.field}>
          <Label>Progress</Label>
          <Progress max={100} size="$4" value={60} width="100%">
            <Progress.Indicator />
          </Progress>
          <Text color="$color10">当前进度：60%</Text>
        </View>
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
            <Label>Slider Replica</Label>
            <Slider
              max={100}
              min={0}
              onValueChange={(nextValue: number[]) => setSliderValue(nextValue[0] ?? 0)}
              value={[sliderValue]}
            />
            <Text color="$color10">当前值：{sliderValue}</Text>
          </View>
          <View style={styles.field}>
            <Label>Slider Tamagui</Label>
            <TamaguiSlider
              max={100}
              min={0}
              onValueChange={(nextValue: number[]) => setTamaguiSliderValue(nextValue[0] ?? 0)}
              value={[tamaguiSliderValue]}
            />
            <Text color="$color10">当前值：{tamaguiSliderValue}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Label>Form</Label>
          <Form
            onSubmit={() => setFormSubmitCount((count) => count + 1)}
            trigger={<Button>提交表单</Button>}
          >
            <View style={styles.formContent}>
              <Input onChangeText={setInputValue} placeholder="workspace name" value={inputValue} />
              <Text color="$color10">已通过 Form 提交：{formSubmitCount} 次</Text>
            </View>
          </Form>
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
              title: "展开面板 multiple1",
              value: "panel1",
            },
            {
              content: <Text>Accordion 默认 API 负责生成 Item、Header、Trigger 和 Content。</Text>,
              title: "展开面板 multiple2",
              value: "panel2",
            },
            {
              content: <Text>Accordion 默认 API 负责生成 Item、Header、Trigger 和 Content。</Text>,
              title: "展开面板 multiple3",
              value: "panel3",
            },
            {
              content: <Text>Accordion 默认 API 负责生成 Item、Header、Trigger 和 Content。</Text>,
              title: "展开面板 multiple4",
              value: "panel4",
            },
          ]}
          type="multiple"
        />

        <Accordion
          items={[
            {
              content: <Text>Accordion 默认 API 负责生成 Item、Header、Trigger 和 Content。</Text>,
              title: "展开面板 single1",
              value: "panel1",
            },
            {
              content: <Text>Accordion 默认 API 负责生成 Item、Header、Trigger 和 Content。</Text>,
              title: "展开面板 single2",
              value: "panel2",
            },
            {
              content: <Text>Accordion 默认 API 负责生成 Item、Header、Trigger 和 Content。</Text>,
              title: "展开面板 single3",
              value: "panel3",
            },
            {
              content: <Text>Accordion 默认 API 负责生成 Item、Header、Trigger 和 Content。</Text>,
              title: "展开面板 single4",
              value: "panel4",
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

          <Dialog
            onOpenChange={setDialogOpen2}
            open={dialogOpen2}
            title="Dialog 标题"
            trigger={
              <Button onPress={() => setDialogOpen2(true)}>打开 Dialog No OverlayPress</Button>
            }
            dismissOnOverlayPress={false}
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

          <AlertDialog
            cancelLabel="取消"
            destructiveLabel="删除"
            description="这个操作无法撤销，仅用于展示组件结构。"
            onOpenChange={setAlertDialogOpen2}
            open={alertDialogOpen2}
            title="删除确认"
            trigger={
              <Button onPress={() => setAlertDialogOpen2(true)}>
                打开 AlertDialog OverlayPress
              </Button>
            }
            dismissOnOverlayPress
          />

          <Popover
            arrow
            content={
              <View style={styles.popoverContent}>
                <View style={styles.popoverFieldRow}>
                  <Text style={styles.popoverFieldLabel}>Name</Text>
                  <Input
                    onChangeText={setPopoverName}
                    placeholder="请输入名称"
                    style={styles.popoverFieldInput}
                    value={popoverName}
                  />
                </View>
                <Button onPress={() => setMenuAction(`Popover submit: ${popoverName}`)}>
                  Submit
                </Button>
              </View>
            }
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

        <DemoRow>
          <Tooltip arrow content="Tooltip 在 web 下会显示，在 native 下主要输出可访问性语义。">
            <Button variant="outlined">悬停 Tooltip</Button>
          </Tooltip>

          <ContextMenu
            arrow
            items={[
              {
                label: "重命名工作区",
                onSelect: () => setContextMenuAction("重命名工作区"),
                value: "rename-workspace",
              },
              {
                label: "separator",
                separator: true,
                value: "separator-main",
              },
              {
                destructive: true,
                label: "移除工作区",
                onSelect: () => setContextMenuAction("移除工作区"),
                value: "remove-workspace",
              },
            ]}
            trigger={<Button variant="outlined">右键 / 长按 ContextMenu</Button>}
          />

          <Button
            onPress={() => {
              setSheetPosition(0);
              setSheetOpen(true);
            }}
            variant="outlined"
          >
            打开 inline Sheet
          </Button>

          <Button
            onPress={() => {
              setGlobalSheetPosition(0);
              setGlobalSnapPointsMode("percent");
              setGlobalSheetOpen(true);
            }}
            variant="outlined"
          >
            打开全局 Sheet percent
          </Button>
          <Button
            onPress={() => {
              setGlobalSheetPosition(0);
              setGlobalSnapPointsMode("constant");
              setGlobalSheetOpen(true);
            }}
            variant="outlined"
          >
            打开全局 Sheet constant
          </Button>
          <Button
            onPress={() => {
              setGlobalSheetPosition(0);
              setGlobalSnapPointsMode("fit");
              setGlobalSheetOpen(true);
            }}
            variant="outlined"
          >
            打开全局 Sheet fit
          </Button>
          <Button
            onPress={() => {
              setGlobalSheetPosition(0);
              setGlobalSnapPointsMode("mixed");
              setGlobalSheetOpen(true);
            }}
            variant="outlined"
          >
            打开全局 Sheet mixed
          </Button>
        </DemoRow>

        <Text color="$color10">
          inline Sheet 状态：{sheetOpen ? `打开，position=${sheetPosition}` : "关闭"}
        </Text>
        <Text color="$color10">
          全局 Sheet 状态：
          {globalSheetOpen ? `打开，position=${globalSheetPosition}` : "关闭"}
        </Text>
        <View style={styles.sheetDemoHost}>
          <Text color="$color10">
            这个示例在调试面板 Dialog 内以 inline 模式渲染，并通过 wrapper 的默认组合 API 生成结构。
          </Text>

          <View style={styles.sheetDemoStage}>
            <Sheet.Controller hidden={false} onOpenChange={handleSheetOpenChange} open={sheetOpen}>
              <Sheet
                content={sheetItems.map((item) => (
                  <View key={item} style={styles.sheetItem}>
                    <Text>{item}</Text>
                  </View>
                ))}
                dismissOnSnapToBottom
                frameProps={{ style: styles.sheetFrame }}
                handle
                modal={false}
                onOpenChange={handleSheetOpenChange}
                onPositionChange={handleSheetPositionChange}
                open={sheetOpen}
                overlay
                overlayProps={{
                  bg: "$shadow6",
                  enterStyle: { opacity: 0 },
                  exitStyle: { opacity: 0 },
                  transition: "lazy",
                }}
                position={sheetPosition}
                scrollView
                scrollViewProps={{ contentContainerStyle: styles.sheetScrollContent }}
                snapPoints={[76, 56]}
                snapPointsMode="percent"
                transition="medium"
              />
            </Sheet.Controller>
          </View>
        </View>

        <Sheet.Controller
          hidden={false}
          onOpenChange={handleGlobalSheetOpenChange}
          open={globalSheetOpen}
        >
          <Sheet
            content={
              <View style={styles.globalSheetContent}>
                <Text fontSize="$5" fontWeight="600">
                  全局 Sheet
                </Text>
                <Text color="$color10">
                  这个示例使用 modal 模式渲染到全局层，不受 inline 调试容器裁剪。
                </Text>
                {sheetItems.map((item) => (
                  <View key={item} style={styles.sheetItem}>
                    <Text>{item}</Text>
                  </View>
                ))}
                <Button onPress={() => setGlobalSheetOpen(false)} theme="accent">
                  关闭全局 Sheet
                </Button>
              </View>
            }
            dismissOnSnapToBottom
            frameProps={{ style: styles.sheetFrame }}
            handle
            modal
            onOpenChange={handleGlobalSheetOpenChange}
            onPositionChange={handleGlobalSheetPositionChange}
            open={globalSheetOpen}
            overlay
            position={globalSheetPosition}
            snapPoints={[62, 86]}
            snapPointsMode={globalSnapPointsMode}
            transition="medium"
          />
        </Sheet.Controller>

        <Text color="$color10">最近菜单动作：{menuAction}</Text>
        <Text color="$color10">最近 ContextMenu 动作：{contextMenuAction}</Text>
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
        <Link href="https://tamagui.dev/llms.txt" target="_blank">
          Tamagui llms.txt
        </Link>
        <Separator />
        <ListGroup
          items={[
            {
              icon: Backpack,
              iconAfter: ChevronRight,
              subTitle: "ListItem wrapper 当前由 ListGroup 统一组织展示。",
              title: "ListGroup / ListItem 组件示例",
            },
            {
              icon: Calendar,
              title: "第二项示例",
            },
          ]}
          rounded="$4"
          self="stretch"
          separator
          size="$4"
        />
        <Separator />
        <DemoRow>
          <View style={styles.mediaDemo}>
            <Text color="$color10">Image</Text>
            <Image
              alt="LonaNote 组件演示图片"
              borderRadius={16}
              height={160}
              objectFit="cover"
              src="https://github.com/luoluoqixi/lonanote/actions/workflows/release.yml/badge.svg"
              width={240}
            />
          </View>

          <View style={styles.mediaDemo}>
            <Text color="$color10">ScrollView</Text>
            <ScrollView
              contentContainerStyle={styles.scrollViewContent}
              style={styles.scrollViewDemo}
            >
              {selectItems.slice(0, 6).map((item) => (
                <View key={item.value} style={styles.scrollViewItem}>
                  <Text>{item.label}</Text>
                </View>
              ))}
            </ScrollView>
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
  checkboxGroup: {
    gap: 0,
  },
  demoGroup: {
    gap: 12,
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
  formContent: {
    gap: 12,
  },
  globalSheetContent: {
    gap: 12,
    paddingLeft: 24,
    paddingRight: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  mediaDemo: {
    flex: 1,
    gap: 8,
    minWidth: 240,
  },
  popoverContent: {
    alignItems: "center",
    gap: 12,
    minWidth: 280,
  },
  popoverFieldInput: {
    flex: 1,
  },
  popoverFieldLabel: {
    minWidth: 48,
  },
  popoverFieldRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  root: {
    gap: 20,
    paddingBottom: 12,
  },
  scrollViewContent: {
    gap: 8,
    padding: 12,
  },
  scrollViewDemo: {
    borderColor: "#d4d4d8",
    borderRadius: 16,
    borderWidth: 1,
    height: 160,
  },
  scrollViewItem: {
    borderColor: "#e4e4e7",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  sheetFrame: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sheetDemoHost: {
    borderColor: "#e4e4e7",
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    padding: 16,
    position: "relative",
  },
  sheetDemoStage: {
    height: 240,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  sheetItem: {
    borderColor: "#e4e4e7",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  sheetScrollContent: {
    gap: 10,
    paddingBottom: 24,
    paddingTop: 12,
  },
  textDemo: {
    flex: 1,
    gap: 4,
    minWidth: 220,
  },
});
