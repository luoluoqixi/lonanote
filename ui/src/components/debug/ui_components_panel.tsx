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

import { isWeb, os } from "@/api/common/platform";
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
import { useToast } from "@/hooks/ui";

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
  const { toast } = useToast();
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [forceNativeHaptics, setForceNativeHaptics] = useState(true);
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
  const [selectValue2, setSelectValue2] = useState<string | null>("light");
  const [selectGroupedValue, setSelectGroupedValue] = useState<string | null>("edit-desc");
  const [selectNativeGroupedValue, setSelectNativeGroupedValue] = useState<string | null>(
    "name-asc",
  );
  const [selectNativePickerValue, setSelectNativePickerValue] = useState<string | null>("blue");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPosition, setSheetPosition] = useState(0);
  const [sheetNativeEnabled, setSheetNativeEnabled] = useState(false);
  const [percentSheetOpen, setPercentSheetOpen] = useState(false);
  const [percentSheetPosition, setPercentSheetPosition] = useState(0);
  const [constantSheetOpen, setConstantSheetOpen] = useState(false);
  const [constantSheetPosition, setConstantSheetPosition] = useState(0);
  const [fitSheetOpen, setFitSheetOpen] = useState(false);
  const [fitSheetPosition, setFitSheetPosition] = useState(0);
  const [mixedSheetOpen, setMixedSheetOpen] = useState(false);
  const [mixedSheetPosition, setMixedSheetPosition] = useState(0);
  const [nestedGlobalSheetOpen, setNestedGlobalSheetOpen] = useState(false);
  const [nestedGlobalSheetPosition, setNestedGlobalSheetPosition] = useState(0);
  const [sliderValue, setSliderValue] = useState(56);
  const [tamaguiSliderValue, setTamaguiSliderValue] = useState(56);
  const [nativeSliderValue, setNativeSliderValue] = useState(50);
  const [switchValue, setSwitchValue] = useState(true);
  const [tabsValue, setTabsValue] = useState("preview");
  const [textAreaValue, setTextAreaValue] = useState("这是一段文本区域示例。");
  const [toggleValue, setToggleValue] = useState("bold");
  const [popoverName, setPopoverName] = useState("LonaNote");
  const debugNativeHaptics = forceNativeHaptics ? true : undefined;

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

  const selectItems2 = useMemo(
    () => [
      { label: "Light", value: "light" },
      { label: "Dark", value: "dark" },
    ],
    [],
  );

  const selectSortGroups = useMemo(
    () => [
      {
        items: [
          { label: "文件名 (A-Z)", value: "name-asc" },
          { label: "文件名 (Z-A)", value: "name-desc" },
        ],
      },
      {
        items: [
          { label: "编辑时间 (从新到旧)", value: "edit-desc" },
          { label: "编辑时间 (从旧到新)", value: "edit-asc" },
        ],
      },
      {
        items: [
          { label: "创建时间 (从新到旧)", value: "create-desc" },
          { label: "创建时间 (从旧到新)", value: "create-asc" },
        ],
      },
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

  const resetNestedGlobalSheet = () => {
    setNestedGlobalSheetOpen(false);
    setNestedGlobalSheetPosition(0);
  };

  const handlePercentSheetOpenChange = (nextOpen: boolean) => {
    setPercentSheetOpen(nextOpen);
    if (!nextOpen) {
      resetNestedGlobalSheet();
    }
  };

  const handlePercentSheetPositionChange = (nextPosition: number) => {
    setPercentSheetPosition(nextPosition);
  };

  const handleConstantSheetOpenChange = (nextOpen: boolean) => {
    setConstantSheetOpen(nextOpen);
  };

  const handleConstantSheetPositionChange = (nextPosition: number) => {
    setConstantSheetPosition(nextPosition);
  };

  const handleFitSheetOpenChange = (nextOpen: boolean) => {
    setFitSheetOpen(nextOpen);
  };

  const handleFitSheetPositionChange = (nextPosition: number) => {
    setFitSheetPosition(nextPosition);
  };

  const handleMixedSheetOpenChange = (nextOpen: boolean) => {
    setMixedSheetOpen(nextOpen);
  };

  const handleMixedSheetPositionChange = (nextPosition: number) => {
    setMixedSheetPosition(nextPosition);
  };

  const handleNestedGlobalSheetOpenChange = (nextOpen: boolean) => {
    setNestedGlobalSheetOpen(nextOpen);
  };

  const handleNestedGlobalSheetPositionChange = (nextPosition: number) => {
    setNestedGlobalSheetPosition(nextPosition);
  };

  const showInfoToast = () => {
    toast.info("检测到新版本", {
      description: "设置页里可以查看本次更新内容。",
    });
  };

  const showWarningToast = () => {
    toast.warning("存储空间不足", {
      description: "建议清理附件缓存后继续导入大文件。",
    });
  };

  const showLoadingToast = () => {
    const toastId = toast.loading("正在生成离线索引", {
      description: "请稍候，完成后会自动提示。",
      duration: Number.POSITIVE_INFINITY,
    });

    setTimeout(() => {
      toast.close(toastId);
      toast.success("离线索引已生成", {
        description: "最近修改的 128 个文件已经可以离线检索。",
      });
    }, 1600);
  };

  const showCustomToast = () => {
    toast.custom(
      () => (
        <View style={styles.customToast}>
          <Text fontSize="$4" fontWeight="700">
            自定义 Toast
          </Text>
          <Text color="$color10">这里可以放任意 JSX，例如更丰富的排版、图标组合或状态摘要。</Text>
        </View>
      ),
      {
        duration: 6000,
      },
    );
  };

  const showPromiseToast = () => {
    toast.promise(
      new Promise<{ refreshedFiles: number }>((resolve) => {
        setTimeout(() => {
          resolve({ refreshedFiles: 42 });
        }, 1500);
      }),
      {
        loading: "正在同步工作区",
        success: "同步完成",
        error: "同步失败",
        description: (result) => {
          if (result instanceof Error) {
            return "请检查当前工作区路径是否仍然可访问。";
          }

          return `已刷新 ${result.refreshedFiles} 个文件的索引状态。`;
        },
      },
    );
  };

  return (
    <View style={styles.root}>
      <SectionCard description="按钮、状态切换和加载反馈。" title="动作与反馈">
        <View style={styles.demoGroup}>
          <Text fontSize="$5" fontWeight="600">
            Native Haptics
          </Text>
          <View style={styles.checkboxGroup}>
            <Checkbox
              checked={forceNativeHaptics}
              label="震动"
              onCheckedChange={(checked) => setForceNativeHaptics(checked === true)}
              size="$4"
            />
          </View>
        </View>

        <View style={styles.demoGroup}>
          <Text fontSize="$5" fontWeight="600">
            Button
          </Text>

          <DemoRow>
            <Button chromeless nativeHaptics={debugNativeHaptics}>
              Plain
            </Button>
            <Button nativeHaptics={debugNativeHaptics} theme="accent">
              Active
            </Button>
            <Button nativeHaptics={debugNativeHaptics} variant="outlined">
              Outlined
            </Button>
            <Button disabled nativeHaptics={debugNativeHaptics}>
              Disabled
            </Button>
          </DemoRow>

          <DemoRow>
            <Button icon={Calendar} nativeHaptics={debugNativeHaptics}>
              icon
            </Button>
            <Button iconAfter={ChevronRight} nativeHaptics={debugNativeHaptics}>
              iconAfter
            </Button>
            <Button icon={RefreshCw} nativeHaptics={debugNativeHaptics} theme="green">
              Themed
            </Button>
            <Button circular icon={Check} aria-label="确认" nativeHaptics={debugNativeHaptics} />
            <Button icon={Backpack} iconSize="$2" nativeHaptics={debugNativeHaptics} theme="blue">
              Blue
            </Button>
            <Button iconAfter={Trash2} nativeHaptics={debugNativeHaptics} theme="red">
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
              nativeHaptics={debugNativeHaptics}
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
            native={false}
            nativeHaptics={debugNativeHaptics}
            onCheckedChange={setSwitchValue}
          />
          <Switch
            checked={switchValue}
            label="Switch native"
            labelPosition="end"
            native
            nativeHaptics={debugNativeHaptics}
            onCheckedChange={setSwitchValue}
          />
        </DemoRow>

        <View style={styles.demoGroup}>
          <Text fontSize="$5" fontWeight="600">
            Toast
          </Text>

          <DemoRow>
            <Button
              nativeHaptics={debugNativeHaptics}
              onPress={() =>
                toast.message("已保存草稿", {
                  description: "状态栏与编辑区内容已同步。",
                })
              }
              variant="outlined"
            >
              Message
            </Button>
            <Button
              nativeHaptics={debugNativeHaptics}
              onPress={() =>
                toast.success("同步完成", {
                  description: "全部文件已经更新到本地索引。",
                })
              }
              theme="green"
            >
              Success
            </Button>
            <Button
              nativeHaptics={debugNativeHaptics}
              onPress={() =>
                toast.error("导出失败", {
                  description: "目标目录没有写入权限。",
                })
              }
              theme="red"
            >
              Error
            </Button>
            <Button nativeHaptics={debugNativeHaptics} onPress={showInfoToast} variant="outlined">
              Info
            </Button>
            <Button
              nativeHaptics={debugNativeHaptics}
              onPress={showWarningToast}
              variant="outlined"
            >
              Warning
            </Button>
          </DemoRow>
          <DemoRow>
            <Button
              nativeHaptics={debugNativeHaptics}
              onPress={showLoadingToast}
              variant="outlined"
            >
              Loading
            </Button>
            <Button nativeHaptics={debugNativeHaptics} onPress={showCustomToast} variant="outlined">
              Custom
            </Button>
            <Button
              nativeHaptics={debugNativeHaptics}
              onPress={showPromiseToast}
              variant="outlined"
            >
              Promise
            </Button>
            <Button nativeHaptics={debugNativeHaptics} onPress={() => toast.closeAll()} chromeless>
              Close all
            </Button>
          </DemoRow>
        </View>

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
              nativeHaptics={debugNativeHaptics}
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

        <View style={styles.field}>
          <Label>Slider Replica</Label>
          <Slider
            max={100}
            min={0}
            native={false}
            nativeHaptics={debugNativeHaptics}
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
            nativeHaptics={debugNativeHaptics}
            onValueChange={(nextValue: number[]) => setTamaguiSliderValue(nextValue[0] ?? 0)}
            value={[tamaguiSliderValue]}
          />
          <Text color="$color10">当前值：{tamaguiSliderValue}</Text>
        </View>
        <View style={styles.field}>
          <Label>Slider Native（@expo/ui SwiftUI / Material3）</Label>
          <Slider
            max={100}
            min={0}
            native
            nativeHaptics={debugNativeHaptics}
            onValueChange={(nextValue: number[]) => setNativeSliderValue(nextValue[0] ?? 0)}
            value={[nativeSliderValue]}
          />
          <Text color="$color10">当前值：{nativeSliderValue}</Text>
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
            <Label>Select {isWeb() ? "" : "(native-sheet)"}</Label>
            <Select
              items={selectItems}
              native="native-sheet"
              nativeHaptics={debugNativeHaptics}
              onValueChange={setSelectValue}
              placeholder="选择主题色"
              value={selectValue ?? undefined}
            />

            {!isWeb() && (
              <>
                <Label>Select (custom-sheet)</Label>
                <Select
                  items={selectItems}
                  native="custom-sheet"
                  nativeHaptics={debugNativeHaptics}
                  onValueChange={setSelectValue}
                  placeholder="选择主题色"
                  value={selectValue ?? undefined}
                />
              </>
            )}
            <Select
              items={selectItems}
              native={false}
              nativeTrigger
              nativeHaptics={debugNativeHaptics}
              onValueChange={setSelectValue}
              placeholder="选择主题色"
              value={selectValue ?? undefined}
            />
            <Text color="$color10">当前主题色：{selectValue ?? "未选择"}</Text>
          </View>
          <View style={styles.field}>
            <Label>Select Native{isWeb() ? "" : " (Dropdown)"}</Label>
            <Select
              items={selectItems}
              native
              nativePickerMode="dropdown"
              nativeHaptics={debugNativeHaptics}
              onValueChange={setSelectNativePickerValue}
              placeholder="选择主题色"
              value={selectNativePickerValue ?? undefined}
            />
            <Select
              items={selectItems}
              native
              nativeTrigger
              nativePickerMode="dropdown"
              nativeHaptics={debugNativeHaptics}
              onValueChange={setSelectNativePickerValue}
              placeholder="选择主题色"
              value={selectNativePickerValue ?? undefined}
            />
            <Text color="$color10">当前主题色(原生)：{selectNativePickerValue ?? "未选择"}</Text>
          </View>
          {os() === "ios" && (
            <View style={styles.field}>
              <Label>Select Native (Wheel Sheet)</Label>
              <Select
                items={selectItems}
                native
                nativePickerMode="wheel"
                nativeHaptics={debugNativeHaptics}
                onValueChange={setSelectNativePickerValue}
                placeholder="选择主题色"
                value={selectNativePickerValue ?? undefined}
              />
              <Select
                items={selectItems}
                native
                nativeTrigger
                nativePickerMode="wheel"
                nativeHaptics={debugNativeHaptics}
                onValueChange={setSelectNativePickerValue}
                placeholder="选择主题色"
                value={selectNativePickerValue ?? undefined}
              />
              <Text color="$color10">
                当前主题色(原生 Sheet)：{selectNativePickerValue ?? "未选择"}
              </Text>
            </View>
          )}
          {os() === "android" && (
            <View style={styles.field}>
              <Label>Select Native (Dialog)</Label>
              <Select
                items={selectItems}
                native
                nativePickerMode="dialog"
                nativeHaptics={debugNativeHaptics}
                onValueChange={setSelectNativePickerValue}
                placeholder="选择主题色"
                value={selectNativePickerValue ?? undefined}
              />
              <Select
                items={selectItems}
                native
                nativeTrigger
                nativePickerMode="dialog"
                nativeHaptics={debugNativeHaptics}
                onValueChange={setSelectNativePickerValue}
                placeholder="选择主题色"
                value={selectNativePickerValue ?? undefined}
              />
              <Text color="$color10">当前主题色(原生)：{selectNativePickerValue ?? "未选择"}</Text>
            </View>
          )}

          <View style={styles.field}>
            {isWeb() && <Label>Select</Label>}
            <Select
              items={selectItems2}
              native={false}
              nativeHaptics={debugNativeHaptics}
              onValueChange={setSelectValue2}
              placeholder="选择主题"
              value={selectValue2 ?? undefined}
            />
            <Select
              items={selectItems2}
              native={false}
              nativeTrigger
              nativeHaptics={debugNativeHaptics}
              onValueChange={setSelectValue2}
              placeholder="选择主题"
              value={selectValue2 ?? undefined}
            />
            <Text color="$color10">当前主题：{selectValue2 ?? "未选择"}</Text>
          </View>
          <View style={styles.field}>
            {isWeb() && <Label>Select Native</Label>}
            <Select
              items={selectItems2}
              nativeHaptics={debugNativeHaptics}
              onValueChange={setSelectValue2}
              placeholder="选择主题"
              value={selectValue2 ?? undefined}
              native
            />
            <Select
              items={selectItems2}
              nativeTrigger
              nativeHaptics={debugNativeHaptics}
              onValueChange={setSelectValue2}
              placeholder="选择主题"
              value={selectValue2 ?? undefined}
              native
            />
            <Text color="$color10">当前主题(原生)：{selectValue2 ?? "未选择"}</Text>
          </View>
          <View style={styles.field}>
            <Label>Select Grouped</Label>
            <Select
              native={false}
              itemGroups={selectSortGroups}
              nativeHaptics={debugNativeHaptics}
              onValueChange={setSelectGroupedValue}
              placeholder="选择排序方式"
              value={selectGroupedValue ?? undefined}
            />
            <Select
              native={false}
              nativeTrigger
              itemGroups={selectSortGroups}
              nativeHaptics={debugNativeHaptics}
              onValueChange={setSelectGroupedValue}
              placeholder="选择排序方式"
              value={selectGroupedValue ?? undefined}
            />
            <Text color="$color10">当前排序：{selectGroupedValue ?? "未选择"}</Text>
          </View>
          <View style={styles.field}>
            <Label>Select Native Grouped</Label>
            <Select
              itemGroups={selectSortGroups}
              nativeHaptics={debugNativeHaptics}
              onValueChange={setSelectNativeGroupedValue}
              placeholder="选择排序方式"
              value={selectNativeGroupedValue ?? undefined}
              native
            />
            <Select
              itemGroups={selectSortGroups}
              nativeTrigger
              nativeHaptics={debugNativeHaptics}
              onValueChange={setSelectNativeGroupedValue}
              placeholder="选择排序方式"
              value={selectNativeGroupedValue ?? undefined}
              native
            />
            <Text color="$color10">当前排序(原生)：{selectNativeGroupedValue ?? "未选择"}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Label>Form</Label>
          <Form
            onSubmit={() => setFormSubmitCount((count) => count + 1)}
            trigger={<Button nativeHaptics={debugNativeHaptics}>提交表单</Button>}
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
          nativeHaptics={debugNativeHaptics}
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
          nativeHaptics={debugNativeHaptics}
          onValueChange={setTabsValue}
          value={tabsValue}
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
          nativeHaptics={debugNativeHaptics}
          type="single"
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
          nativeHaptics={debugNativeHaptics}
          type="multiple"
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
            trigger={
              <Button nativeHaptics={debugNativeHaptics} onPress={() => setDialogOpen(true)}>
                打开 Dialog
              </Button>
            }
          >
            <Text>这是 Dialog 内容区域。</Text>
          </Dialog>

          <Dialog
            onOpenChange={setDialogOpen2}
            open={dialogOpen2}
            title="Dialog 标题"
            trigger={
              <Button nativeHaptics={debugNativeHaptics} onPress={() => setDialogOpen2(true)}>
                打开 Dialog No OverlayPress
              </Button>
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
            trigger={
              <Button nativeHaptics={debugNativeHaptics} onPress={() => setAlertDialogOpen(true)}>
                打开 AlertDialog
              </Button>
            }
          />

          <AlertDialog
            cancelLabel="取消"
            destructiveLabel="删除"
            description="这个操作无法撤销，仅用于展示组件结构。"
            onOpenChange={setAlertDialogOpen2}
            open={alertDialogOpen2}
            title="删除确认"
            trigger={
              <Button nativeHaptics={debugNativeHaptics} onPress={() => setAlertDialogOpen2(true)}>
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
                <Button
                  nativeHaptics={debugNativeHaptics}
                  onPress={() => setMenuAction(`Popover submit: ${popoverName}`)}
                >
                  Submit
                </Button>
              </View>
            }
            trigger={
              <Button nativeHaptics={debugNativeHaptics} variant="outlined">
                打开 Popover
              </Button>
            }
          />

          <Menu
            arrow
            items={[
              {
                label: "关于笔记",
                onSelect: () => setMenuAction("快捷 Menu: 关于笔记"),
                value: "quick-about-notes",
              },
              {
                label: "separator",
                separator: true,
                value: "quick-separator-main",
              },
              {
                label: "设置",
                onSelect: () => setMenuAction("快捷 Menu: 设置"),
                value: "quick-settings",
              },
              {
                destructive: true,
                label: "删除全部",
                onSelect: () => setMenuAction("快捷 Menu: 删除全部"),
                value: "quick-delete-all",
              },
            ]}
            trigger={
              <Button
                icon={Backpack}
                nativeHaptics={debugNativeHaptics}
                size="$4"
                variant="outlined"
              >
                打开快捷 Menu
              </Button>
            }
          />

          <Menu>
            <Menu.Trigger>
              <Button
                icon={Backpack}
                nativeHaptics={debugNativeHaptics}
                size="$4"
                variant="outlined"
              >
                打开复杂 Menu
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
            <Button nativeHaptics={debugNativeHaptics} variant="outlined">
              悬停 Tooltip
            </Button>
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
            nativeHaptics={debugNativeHaptics}
            trigger={<Button variant="outlined">右键 / 长按 ContextMenu</Button>}
          />

          <DemoRow>
            <Switch
              checked={sheetNativeEnabled}
              label={"Sheet native"}
              labelPosition="end"
              onCheckedChange={setSheetNativeEnabled}
            />
          </DemoRow>

          <Button
            nativeHaptics={debugNativeHaptics}
            onPress={() => {
              setSheetPosition(0);
              setSheetOpen(true);
            }}
            variant="outlined"
          >
            打开 inline Sheet
          </Button>

          <Button
            nativeHaptics={debugNativeHaptics}
            onPress={() => {
              setPercentSheetPosition(0);
              setPercentSheetOpen(true);
            }}
            variant="outlined"
          >
            打开全局 Sheet percent
          </Button>
          <Button
            nativeHaptics={debugNativeHaptics}
            onPress={() => {
              setConstantSheetPosition(0);
              setConstantSheetOpen(true);
            }}
            variant="outlined"
          >
            打开全局 Sheet constant
          </Button>
          <Button
            nativeHaptics={debugNativeHaptics}
            onPress={() => {
              setFitSheetPosition(0);
              setFitSheetOpen(true);
            }}
            variant="outlined"
          >
            打开全局 Sheet fit
          </Button>
          <Button
            nativeHaptics={debugNativeHaptics}
            onPress={() => {
              setMixedSheetPosition(0);
              setMixedSheetOpen(true);
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
          全局 Sheet percent：
          {percentSheetOpen ? `打开，position=${percentSheetPosition}` : "关闭"}
        </Text>
        <Text color="$color10">
          全局 Sheet constant：
          {constantSheetOpen ? `打开，position=${constantSheetPosition}` : "关闭"}
        </Text>
        <Text color="$color10">
          全局 Sheet fit：
          {fitSheetOpen ? `打开，position=${fitSheetPosition}` : "关闭"}
        </Text>
        <Text color="$color10">
          全局 Sheet mixed：
          {mixedSheetOpen ? `打开，position=${mixedSheetPosition}` : "关闭"}
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
          onOpenChange={handlePercentSheetOpenChange}
          open={percentSheetOpen}
        >
          <Sheet
            content={
              <View style={styles.globalSheetContent}>
                <Text fontSize="$5" fontWeight="600">
                  全局 Sheet percent
                </Text>
                <Text color="$color10">
                  这个示例使用 modal 模式渲染到全局层，并固定为 percent snapPoints。
                </Text>
                {sheetItems.map((item) => (
                  <View key={item} style={styles.sheetItem}>
                    <Text>{item}</Text>
                  </View>
                ))}
                <Button
                  nativeHaptics={debugNativeHaptics}
                  onPress={() => {
                    setNestedGlobalSheetPosition(0);
                    setNestedGlobalSheetOpen(true);
                  }}
                  variant="outlined"
                >
                  打开内层 Sheet
                </Button>
                <Button
                  nativeHaptics={debugNativeHaptics}
                  onPress={() => setPercentSheetOpen(false)}
                  theme="accent"
                >
                  关闭全局 Sheet percent
                </Button>

                <Sheet.Controller
                  hidden={false}
                  onOpenChange={handleNestedGlobalSheetOpenChange}
                  open={nestedGlobalSheetOpen}
                >
                  <Sheet
                    content={
                      <View style={styles.nestedSheetContent}>
                        <Text fontSize="$6" fontWeight="700">
                          内层 Sheet
                        </Text>
                        <Text color="$color10">
                          这个示例复用当前 wrapper，在外层 Sheet 内再打开一个 modal Sheet。
                        </Text>
                        <Text>
                          这里可以放更细一级的操作，例如二次确认、补充配置，或者像 Tamagui
                          官方示例那样继续展示嵌套弹层行为。
                        </Text>
                        <Button
                          nativeHaptics={debugNativeHaptics}
                          onPress={() => setNestedGlobalSheetOpen(false)}
                          theme="accent"
                        >
                          关闭内层 Sheet
                        </Button>
                      </View>
                    }
                    dismissOnSnapToBottom
                    frameProps={{ style: styles.sheetFrame }}
                    handle
                    modal
                    native={sheetNativeEnabled}
                    onOpenChange={handleNestedGlobalSheetOpenChange}
                    onPositionChange={handleNestedGlobalSheetPositionChange}
                    open={nestedGlobalSheetOpen}
                    overlay
                    position={nestedGlobalSheetPosition}
                    snapPoints={[72, 88]}
                    snapPointsMode="percent"
                    transition="medium"
                  />
                </Sheet.Controller>
              </View>
            }
            dismissOnSnapToBottom
            frameProps={{ style: styles.sheetFrame }}
            handle
            modal
            native={sheetNativeEnabled}
            onOpenChange={handlePercentSheetOpenChange}
            onPositionChange={handlePercentSheetPositionChange}
            open={percentSheetOpen}
            overlay
            position={percentSheetPosition}
            snapPoints={[62, 90]}
            snapPointsMode="percent"
            transition="medium"
          />
        </Sheet.Controller>

        <Sheet.Controller
          hidden={false}
          onOpenChange={handleConstantSheetOpenChange}
          open={constantSheetOpen}
        >
          <Sheet
            content={
              <View style={styles.globalSheetContent}>
                <Text fontSize="$5" fontWeight="600">
                  全局 Sheet constant
                </Text>
                <Text color="$color10">
                  这个示例使用 modal 模式渲染到全局层，并固定为 constant snapPoints。
                </Text>
                {sheetItems.map((item) => (
                  <View key={item} style={styles.sheetItem}>
                    <Text>{item}</Text>
                  </View>
                ))}
                <Button
                  nativeHaptics={debugNativeHaptics}
                  onPress={() => setConstantSheetOpen(false)}
                  theme="accent"
                >
                  关闭全局 Sheet constant
                </Button>
              </View>
            }
            dismissOnSnapToBottom
            frameProps={{ style: styles.sheetFrame }}
            handle
            modal
            native={sheetNativeEnabled}
            onOpenChange={handleConstantSheetOpenChange}
            onPositionChange={handleConstantSheetPositionChange}
            open={constantSheetOpen}
            overlay
            position={constantSheetPosition}
            snapPoints={[360, 560]}
            snapPointsMode="constant"
            transition="medium"
          />
        </Sheet.Controller>

        <Sheet.Controller
          hidden={false}
          onOpenChange={handleFitSheetOpenChange}
          open={fitSheetOpen}
        >
          <Sheet
            content={
              <View style={styles.globalSheetContent}>
                <Text fontSize="$5" fontWeight="600">
                  全局 Sheet fit
                </Text>
                <Text color="$color10">
                  这个示例使用 modal 模式渲染到全局层，并固定为 fit 模式。
                </Text>
                {sheetItems.map((item) => (
                  <View key={item} style={styles.sheetItem}>
                    <Text>{item}</Text>
                  </View>
                ))}
                <Button
                  nativeHaptics={debugNativeHaptics}
                  onPress={() => setFitSheetOpen(false)}
                  theme="accent"
                >
                  关闭全局 Sheet fit
                </Button>
              </View>
            }
            dismissOnSnapToBottom
            frameProps={{ style: styles.sheetFrame }}
            handle
            modal
            native={sheetNativeEnabled}
            onOpenChange={handleFitSheetOpenChange}
            onPositionChange={handleFitSheetPositionChange}
            open={fitSheetOpen}
            overlay
            position={fitSheetPosition}
            snapPointsMode="fit"
            transition="medium"
          />
        </Sheet.Controller>

        <Sheet.Controller
          hidden={false}
          onOpenChange={handleMixedSheetOpenChange}
          open={mixedSheetOpen}
        >
          <Sheet
            content={
              <View style={styles.globalSheetContent}>
                <Text fontSize="$5" fontWeight="600">
                  全局 Sheet mixed
                </Text>
                <Text color="$color10">
                  这个示例使用 modal 模式渲染到全局层，并固定为 mixed snapPoints。
                </Text>
                {sheetItems.map((item) => (
                  <View key={item} style={styles.sheetItem}>
                    <Text>{item}</Text>
                  </View>
                ))}
                <Button
                  nativeHaptics={debugNativeHaptics}
                  onPress={() => setMixedSheetOpen(false)}
                  theme="accent"
                >
                  关闭全局 Sheet mixed
                </Button>
              </View>
            }
            dismissOnSnapToBottom
            frameProps={{ style: styles.sheetFrame }}
            handle
            modal
            native={sheetNativeEnabled}
            onOpenChange={handleMixedSheetOpenChange}
            onPositionChange={handleMixedSheetPositionChange}
            open={mixedSheetOpen}
            overlay
            position={mixedSheetPosition}
            snapPoints={["fit", "80%"]}
            snapPointsMode="mixed"
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
        <Link
          href="https://tamagui.dev/llms.txt"
          nativeHaptics={debugNativeHaptics}
          target="_blank"
        >
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
          nativeHaptics={debugNativeHaptics}
          rounded="$4"
          self="stretch"
          separator
          size="$4"
        />
        <Separator />
        <View style={styles.mediaDemo}>
          <Text color="$color10">Image</Text>
          <Image
            alt="LonaNote 组件演示图片"
            borderRadius={16}
            height={160}
            objectFit="cover"
            src="https://picsum.photos/200/300"
            width={240}
          />
        </View>

        <View style={styles.scrollViewShowcase}>
          <Text color="$color10">ScrollView</Text>
          <Text color="$color10">这个区域应当独立于页面本身上下滚动。</Text>
          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            directionalLockEnabled
            nestedScrollEnabled
            scrollEnabled
            showsVerticalScrollIndicator
            style={styles.scrollViewDemo}
          >
            {selectItems.map((item) => (
              <View key={item.value} style={styles.scrollViewItem}>
                <Text>{item.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
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
  customToast: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e7",
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  demoGroup: {
    gap: 12,
  },
  field: {
    flex: 1,
    gap: 8,
    minWidth: 200,
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
  nestedSheetContent: {
    gap: 16,
    paddingLeft: 24,
    paddingRight: 24,
    paddingBottom: 24,
    paddingTop: 12,
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
    alignSelf: "stretch",
    borderColor: "#d4d4d8",
    borderRadius: 16,
    borderWidth: 1,
    height: 240,
  },
  scrollViewItem: {
    borderColor: "#e4e4e7",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scrollViewShowcase: {
    alignSelf: "stretch",
    gap: 8,
    width: "100%",
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
