import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import {
  Accordion,
  Alert,
  AlertDialog,
  Avatar,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardTitle,
  Checkbox,
  Chip,
  CloseButton,
  Description,
  Dialog,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
  FieldError,
  Header,
  IconButton,
  Input,
  InputGroup,
  InputOTP as InputOtp,
  Label,
  Link,
  ListBox,
  Popover,
  RadioGroup,
  ScrollShadow,
  SearchField,
  Select,
  Separator,
  Skeleton,
  Slider,
  Spinner,
  Surface,
  Switch,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsListContainer,
  TabsPanel,
  TabsTab,
  TagGroup,
  TextArea,
  TextField,
  ToggleButton,
  Text as UiText,
} from "@/components/ui";
import { useToast } from "@/hooks/ui";

type SectionCardProps = {
  children: ReactNode;
  description: string;
  title: string;
};

type ShowcaseBlockProps = {
  children: ReactNode;
  components: string[];
  description: string;
  title: string;
};

function SectionCard({ children, description, title }: SectionCardProps) {
  return (
    <Card className="overflow-hidden border border-foreground/10 bg-background shadow-none">
      <View className="gap-1 px-4 pt-4">
        <UiText className="text-lg font-semibold text-foreground">{title}</UiText>
        <UiText className="text-sm text-foreground/60">{description}</UiText>
      </View>
      <CardBody className="gap-4 px-4 pb-4">{children}</CardBody>
    </Card>
  );
}

function ShowcaseBlock({ children, components, description, title }: ShowcaseBlockProps) {
  return (
    <View className="gap-4 rounded-3xl border border-foreground/10 bg-background p-5">
      <View className="gap-2">
        <UiText className="text-lg font-semibold text-foreground">{title}</UiText>
        <UiText className="text-sm leading-6 text-foreground/60">{description}</UiText>
        <View className="flex-row flex-wrap gap-2">
          {components.map((componentName) => (
            <Chip key={componentName}>{componentName}</Chip>
          ))}
        </View>
      </View>
      {children}
    </View>
  );
}

function DemoRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <View
      className={`flex-row flex-wrap items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 ${className}`}
    >
      {children}
    </View>
  );
}

function DemoField() {
  const [value, setValue] = useState("lonanote");

  return (
    <TextField>
      <Label>用户名</Label>
      <Input accessibilityLabel="用户名输入框" onValueChange={setValue} value={value} />
      <Description>支持输入普通文本。</Description>
      <FieldError>这里只是 FieldError 的示例。</FieldError>
    </TextField>
  );
}

function DemoDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onPress={() => setIsOpen(true)}>
        打开 Dialog
      </Button>
      <Dialog
        accessibilityLabel="Dialog 示例"
        actions={
          <>
            <Button variant="outline" onPress={() => setIsOpen(false)}>
              取消
            </Button>
            <Button onPress={() => setIsOpen(false)}>确认</Button>
          </>
        }
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Dialog 标题"
      >
        <UiText className="text-sm text-foreground/70">这是 Dialog 内容区域。</UiText>
      </Dialog>
    </>
  );
}

function DemoAlertDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onPress={() => setIsOpen(true)}>
        打开 AlertDialog
      </Button>
      <AlertDialog
        accessibilityLabel="AlertDialog 示例"
        actions={
          <>
            <Button variant="outline" onPress={() => setIsOpen(false)}>
              取消
            </Button>
            <Button onPress={() => setIsOpen(false)}>删除</Button>
          </>
        }
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="删除确认"
      >
        <UiText className="text-sm text-foreground/70">
          这个操作无法撤销，仅用于展示组件结构。
        </UiText>
      </AlertDialog>
    </>
  );
}

function DemoPopover() {
  return (
    <Popover>
      <Popover.Trigger>
        <Button variant="outline">打开 Popover</Button>
      </Popover.Trigger>
      <Popover.Content accessibilityLabel="Popover 示例">
        <View className="gap-2 rounded-2xl border border-foreground/10 bg-background p-3">
          <Popover.Title className="text-sm font-medium text-foreground">
            Popover 内容
          </Popover.Title>
          <UiText className="text-sm text-foreground/65">这里可放任意说明或操作。</UiText>
        </View>
      </Popover.Content>
    </Popover>
  );
}

function DemoDropdown() {
  return (
    <Dropdown>
      <DropdownTrigger className="rounded-xl border border-foreground/15 bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-foreground/5">
        打开 Dropdown
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownMenu accessibilityLabel="组件操作菜单">
          <DropdownItem>新建笔记</DropdownItem>
          <DropdownItem>重命名</DropdownItem>
          <DropdownItem>删除</DropdownItem>
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
}

function DemoSearchField() {
  const [searchValue, setSearchValue] = useState("");

  return (
    <SearchField
      accessibilityLabel="组件搜索"
      className="w-full"
      onValueChange={setSearchValue}
      value={searchValue}
    >
      <SearchField.Group className="flex-row items-center gap-2 rounded-2xl border border-foreground/10 bg-background px-3 py-2 shadow-sm">
        <SearchField.SearchIcon className="text-foreground/45" />
        <SearchField.Input className="flex-1 bg-transparent" placeholder="搜索组件" />
        <SearchField.ClearButton className="text-foreground/45" />
      </SearchField.Group>
    </SearchField>
  );
}

function DemoOtpField() {
  const [otp, setOtp] = useState("1234");

  return (
    <InputOtp accessibilityLabel="验证码输入" maxLength={4} onValueChange={setOtp} value={otp}>
      <InputOtp.Group>
        <InputOtp.Slot index={0} />
        <InputOtp.Slot index={1} />
        <InputOtp.Separator />
        <InputOtp.Slot index={2} />
        <InputOtp.Slot index={3} />
      </InputOtp.Group>
    </InputOtp>
  );
}

function DemoRadioGroup({
  onValueChange,
  value,
}: {
  onValueChange: (nextValue: string) => void;
  value: string;
}) {
  return (
    <View className="gap-3 rounded-2xl border border-foreground/10 bg-background p-3">
      <UiText className="text-xs font-medium uppercase tracking-wide text-foreground/45">
        RadioGroup
      </UiText>
      <RadioGroup accessibilityLabel="排序方式" onValueChange={onValueChange} value={value}>
        <RadioGroup.Item value="recent">最近更新</RadioGroup.Item>
        <RadioGroup.Item value="name">按名称</RadioGroup.Item>
        <RadioGroup.Item value="size">按大小</RadioGroup.Item>
      </RadioGroup>
      <UiText className="text-sm text-foreground/60">当前选择：{value}</UiText>
    </View>
  );
}

export function UiComponentsDebugPanel() {
  const { toastInfo } = useToast();
  const [checkboxValue, setCheckboxValue] = useState(true);
  const [radioValue, setRadioValue] = useState("recent");
  const [switchValue, setSwitchValue] = useState(true);
  const [toggleValue, setToggleValue] = useState(true);
  const [sliderValue, setSliderValue] = useState(56);
  const [textFieldValue, setTextFieldValue] = useState("Debug text field");
  const [textAreaValue, setTextAreaValue] = useState("这是一段文本区域示例。");
  const [selectValue, setSelectValue] = useState<string | null>("blue");
  const [tabsValue, setTabsValue] = useState("preview");

  const colorOptions = useMemo(
    () => [
      { label: "蓝色", value: "blue" },
      { label: "绿色", value: "green" },
      { label: "橙色", value: "orange" },
    ],
    [],
  );

  return (
    <View className="gap-5 pb-3">
      <SectionCard
        description="先看动作入口、状态切换和即时反馈，不把不同类型硬挤在同一块。"
        title="动作与反馈"
      >
        <View className="gap-4">
          <ShowcaseBlock
            components={["button", "icon_button", "close_button", "link"]}
            description="把主按钮、图标按钮、关闭按钮和轻量跳转放在同一组里，方便横向比较交互密度。"
            title="主操作入口"
          >
            <DemoRow>
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <IconButton accessibilityLabel="图标按钮">
                <Text className="text-base font-semibold text-foreground">×</Text>
              </IconButton>
              <CloseButton accessibilityLabel="关闭示例" />
              <Link
                onPress={() => {
                  toastInfo("Link 示例只触发提示，不直接跳转。");
                }}
              >
                Link
              </Link>
              <Button
                variant="outline"
                onPress={() => {
                  toastInfo("这是一个 Toast 提示");
                }}
              >
                Toast 提示
              </Button>
            </DemoRow>
          </ShowcaseBlock>

          <ShowcaseBlock
            components={["checkbox", "switch", "toggle_button", "radio_group"]}
            description="这一组只放状态切换与单选控件，同类控件并排，避免和按钮、反馈混在一起。"
            title="选择与状态切换"
          >
            <DemoRow className="gap-4">
              <View className="flex-row items-center gap-2 rounded-full border border-foreground/10 bg-background px-3 py-2">
                <Switch
                  accessibilityLabel="启用示例开关"
                  onValueChange={setSwitchValue}
                  value={switchValue}
                />
                <UiText className="text-sm text-foreground/70">Switch</UiText>
              </View>
              <Checkbox
                accessibilityLabel="示例复选框"
                onValueChange={setCheckboxValue}
                value={checkboxValue}
              >
                复选框
              </Checkbox>
              <ToggleButton onValueChange={setToggleValue} defaultSelected={toggleValue}>
                Toggle
              </ToggleButton>
            </DemoRow>
            <DemoRow className="items-start">
              <DemoRadioGroup onValueChange={setRadioValue} value={radioValue} />
            </DemoRow>
          </ShowcaseBlock>

          <ShowcaseBlock
            components={["alert", "chip", "separator", "skeleton", "spinner"]}
            description="即时反馈、占位、分隔和标签统一归类，便于查看它们在信息层级里的作用。"
            title="即时反馈与标记"
          >
            <DemoRow className="justify-between gap-4">
              <View className="flex-row flex-wrap items-center gap-4">
                <Spinner />
                <Separator className="w-24" />
                <Skeleton className="rounded-full">
                  <View className="h-6 w-24 rounded-full bg-foreground/10" />
                </Skeleton>
              </View>
              <View className="flex-row flex-wrap items-center gap-2">
                <Chip color="default" size="sm" variant="outline">
                  默认标签
                </Chip>
                <Chip color="accent" size="sm" variant="soft">
                  状态标签
                </Chip>
              </View>
            </DemoRow>
            <Alert status="default">
              <Alert.Indicator>ℹ</Alert.Indicator>
              <Alert.Content>
                <Alert.Title>提示</Alert.Title>
                <Alert.Description>这是 Alert 组件的实际展示。</Alert.Description>
              </Alert.Content>
            </Alert>
          </ShowcaseBlock>
        </View>
      </SectionCard>

      <SectionCard
        description="输入类组件拆成文本字段、组合输入、富输入和数值选择四组，避免互相抢空间。"
        title="输入与选择"
      >
        <View className="gap-4">
          <ShowcaseBlock
            components={["text_field", "label", "input", "description", "field_error"]}
            description="把字段容器与辅助文案放在一组里，直接展示完整的字段栈。"
            title="文本字段栈"
          >
            <View className="flex-row flex-wrap gap-4">
              <View className="min-w-[320px] flex-1 gap-4">
                <DemoField />
              </View>
              <View className="min-w-[320px] flex-1 gap-4">
                <TextField>
                  <Label>受控输入</Label>
                  <Input onValueChange={setTextFieldValue} value={textFieldValue} />
                  <Description>当前值：{textFieldValue}</Description>
                </TextField>
              </View>
            </View>
          </ShowcaseBlock>

          <ShowcaseBlock
            components={["input_group", "search_field"]}
            description="组合输入和搜索输入并排展示，方便比较前后缀与搜索清空按钮的交互差异。"
            title="组合与搜索"
          >
            <View className="flex-row flex-wrap gap-4">
              <View className="min-w-[320px] flex-1 gap-4">
                <InputGroup>
                  <InputGroup.Prefix>@</InputGroup.Prefix>
                  <InputGroup.Input accessibilityLabel="账号输入" placeholder="account" />
                  <InputGroup.Suffix>.dev</InputGroup.Suffix>
                </InputGroup>
              </View>
              <View className="min-w-[320px] flex-1 gap-4">
                <DemoSearchField />
              </View>
            </View>
          </ShowcaseBlock>

          <ShowcaseBlock
            components={["text_area", "input_otp"]}
            description="多行文本和验证码输入都需要更大的操作空间，所以单独成组。"
            title="多行与验证码"
          >
            <View className="flex-row flex-wrap gap-4">
              <View className="min-w-[320px] flex-1 gap-4">
                <TextArea
                  accessibilityLabel="备注输入"
                  onValueChange={setTextAreaValue}
                  placeholder="输入备注"
                  rows={4}
                  value={textAreaValue}
                />
              </View>
              <View className="min-w-[320px] flex-1 gap-4">
                <DemoOtpField />
              </View>
            </View>
          </ShowcaseBlock>

          <ShowcaseBlock
            components={["select", "slider"]}
            description="选择器和滑杆都属于值选择输入，放在一行内更容易观察当前值的变化。"
            title="选择输入"
          >
            <View className="flex-row flex-wrap gap-4">
              <View className="min-w-[320px] flex-1 gap-3">
                <Select
                  accessibilityLabel="主题色"
                  onValueChange={setSelectValue}
                  options={colorOptions}
                  placeholder="选择主题色"
                  value={selectValue ?? undefined}
                />
                <UiText className="text-sm text-foreground/60">
                  当前主题色：{selectValue ?? "未选择"}
                </UiText>
              </View>
              <View className="min-w-[320px] flex-1 gap-3">
                <Slider
                  accessibilityLabel="缩放"
                  className="w-full"
                  maxValue={100}
                  minValue={0}
                  onValueChange={(nextValue) =>
                    setSliderValue(Array.isArray(nextValue) ? nextValue[0] : nextValue)
                  }
                  value={sliderValue}
                />
                <UiText className="text-sm text-foreground/60">当前值：{sliderValue}</UiText>
              </View>
            </View>
          </ShowcaseBlock>
        </View>
      </SectionCard>

      <SectionCard
        description="浮层组件和页内导航组件各自成块，避免弹层类和内容类控件挤在一起。"
        title="浮层与导航"
      >
        <View className="gap-4">
          <ShowcaseBlock
            components={["dialog", "alert_dialog", "popover", "dropdown"]}
            description="对话框和上下文浮层统一放在这里，直接看各类弹层的触发方式与内容承载方式。"
            title="对话框与上下文浮层"
          >
            <DemoRow>
              <DemoDialog />
              <DemoAlertDialog />
            </DemoRow>
            <DemoRow>
              <DemoPopover />
              <DemoDropdown />
            </DemoRow>
          </ShowcaseBlock>

          <ShowcaseBlock
            components={["tabs", "accordion"]}
            description="页内导航和折叠内容都放在同一类里，但各自单独占行，层级会更清楚。"
            title="页内导航与折叠"
          >
            <View className="gap-4">
              <Tabs accessibilityLabel="预览选项卡" onValueChange={setTabsValue} value={tabsValue}>
                <TabsListContainer>
                  <TabsList>
                    <TabsTab value="preview">
                      <TabsIndicator />
                      预览
                    </TabsTab>
                    <TabsTab value="notes">
                      <TabsIndicator />
                      说明
                    </TabsTab>
                  </TabsList>
                </TabsListContainer>
                <TabsPanel value="preview">
                  <View className="rounded-xl border border-foreground/10 bg-background px-3 py-3">
                    <Text className="text-sm text-foreground">当前选中的 tab 是 {tabsValue}</Text>
                  </View>
                </TabsPanel>
                <TabsPanel value="notes">
                  <View className="rounded-xl border border-foreground/10 bg-background px-3 py-3">
                    <Text className="text-sm text-foreground">
                      Tabs 这里单独展示页内内容切换，不再和别的类型混排。
                    </Text>
                  </View>
                </TabsPanel>
              </Tabs>

              <Accordion accessibilityLabel="折叠展示示例">
                <Accordion.Item>
                  <Accordion.Trigger className="flex-row items-center justify-between gap-3">
                    <UiText className="text-base font-medium text-foreground">展开面板</UiText>
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                  <Accordion.Content>
                    <UiText className="text-sm text-foreground/70">Accordion 的内容区。</UiText>
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion>
            </View>
          </ShowcaseBlock>
        </View>
      </SectionCard>

      <SectionCard
        description="展示类组件与容器组件拆开，让文本、集合、滚动和承载面各自有清晰位置。"
        title="展示与容器"
      >
        <View className="gap-4">
          <ShowcaseBlock
            components={["avatar", "text", "surface"]}
            description="基础展示元素放在一起，避免和集合组件、滚动组件混在一块。"
            title="文本、头像与承载面"
          >
            <DemoRow className="items-start">
              <Avatar fallback="LN" size="sm" />
              <View className="min-w-[220px] flex-1 gap-2">
                <UiText className="text-base font-semibold text-foreground">Text 组件示例</UiText>
                <UiText className="text-sm leading-6 text-foreground/70">
                  这里用 Text 呈现标题、正文和说明文案，适合和 Avatar、Surface 一起观察排版层级。
                </UiText>
              </View>
              <Surface className="rounded-2xl border border-foreground/10 px-4 py-3">
                <UiText className="text-sm text-foreground">Surface 承载一小块强调内容</UiText>
              </Surface>
            </DemoRow>
          </ShowcaseBlock>

          <ShowcaseBlock
            components={["tag_group", "list_box", "scroll_shadow"]}
            description="集合类组件单独成组，方便看标签集合、列表集合和滚动阴影在空间占用上的差别。"
            title="集合与滚动展示"
          >
            <View className="flex-row flex-wrap gap-4">
              <View className="min-w-[320px] flex-1 gap-4">
                <View className="gap-2">
                  <UiText className="text-sm font-medium text-foreground">TagGroup</UiText>
                  <TagGroup
                    accessibilityLabel="标签组示例"
                    nativeProps={{
                      defaultSelectedKeys: ["tag-b"],
                      selectionMode: "single",
                    }}
                    variant="surface"
                    webProps={{
                      defaultSelectedKeys: ["tag-b"],
                      selectionMode: "single",
                    }}
                  >
                    <TagGroup.List className="flex-row flex-wrap gap-2">
                      <TagGroup.Item key="tag-a">Tag A</TagGroup.Item>
                      <TagGroup.Item key="tag-b">Tag B</TagGroup.Item>
                      <TagGroup.Item key="tag-c">Tag C</TagGroup.Item>
                    </TagGroup.List>
                  </TagGroup>
                </View>

                <Surface className="overflow-hidden rounded-3xl border border-foreground/10 bg-background shadow-none">
                  <ListBox
                    accessibilityLabel="文件操作列表"
                    className="w-full p-2"
                    webProps={{
                      onAction: (key) => toastInfo(`选择了 ${String(key)}`),
                      selectionMode: "none",
                    }}
                  >
                    <ListBox.Section webProps={{ "aria-label": "Actions" }}>
                      <Header className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wide text-foreground/45">
                        Actions
                      </Header>
                      <ListBox.Item className="rounded-2xl px-3 py-2" textValue="新建文件">
                        <View className="flex-row items-start gap-3">
                          <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-xl bg-accent/10">
                            <UiText className="text-sm font-semibold text-accent">+</UiText>
                          </View>
                          <View className="min-w-0 flex-1 gap-0.5">
                            <Label>New file</Label>
                            <Description>Create a new file</Description>
                          </View>
                          <View className="rounded-lg border border-foreground/10 bg-foreground/5 px-2 py-1">
                            <UiText className="text-xs font-medium text-foreground/60">N</UiText>
                          </View>
                        </View>
                      </ListBox.Item>
                      <ListBox.Item className="rounded-2xl px-3 py-2" textValue="编辑文件">
                        <View className="flex-row items-start gap-3">
                          <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                            <UiText className="text-sm font-semibold text-foreground/65">✎</UiText>
                          </View>
                          <View className="min-w-0 flex-1 gap-0.5">
                            <Label>Edit file</Label>
                            <Description>Make changes</Description>
                          </View>
                          <View className="rounded-lg border border-foreground/10 bg-foreground/5 px-2 py-1">
                            <UiText className="text-xs font-medium text-foreground/60">E</UiText>
                          </View>
                        </View>
                      </ListBox.Item>
                    </ListBox.Section>

                    <ListBox.Section
                      className="mt-2 border-t border-foreground/10 pt-2"
                      webProps={{ "aria-label": "Danger zone" }}
                    >
                      <Header className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wide text-danger/70">
                        Danger zone
                      </Header>
                      <ListBox.Item
                        className="rounded-2xl px-3 py-2"
                        textValue="删除文件"
                        webProps={{ variant: "danger" }}
                      >
                        <View className="flex-row items-start gap-3">
                          <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-xl bg-danger/10">
                            <UiText className="text-sm font-semibold text-danger">×</UiText>
                          </View>
                          <View className="min-w-0 flex-1 gap-0.5">
                            <Label>Delete file</Label>
                            <Description>Move to trash</Description>
                          </View>
                          <View className="rounded-lg border border-foreground/10 bg-foreground/5 px-2 py-1">
                            <UiText className="text-xs font-medium text-foreground/60">⇧D</UiText>
                          </View>
                        </View>
                      </ListBox.Item>
                    </ListBox.Section>
                  </ListBox>
                </Surface>
              </View>

              <View className="min-w-[320px] flex-1 gap-4">
                <ScrollShadow className="max-h-32 rounded-xl border border-foreground/10 p-3">
                  <View className="gap-2 pr-3">
                    <UiText className="text-sm text-foreground/70">
                      第一段滚动内容，用来制造真实的纵向溢出。
                    </UiText>
                    <UiText className="text-sm text-foreground/70">
                      第二段滚动内容，确保容器进入可滚动状态。
                    </UiText>
                    <UiText className="text-sm text-foreground/70">
                      第三段滚动内容，方便观察阴影和可视区域边界。
                    </UiText>
                    <UiText className="text-sm text-foreground/70">
                      第四段滚动内容，继续拉高内容高度。
                    </UiText>
                    <UiText className="text-sm text-foreground/70">
                      第五段滚动内容，滚动时能明显看到过渡阴影。
                    </UiText>
                    <UiText className="text-sm text-foreground/70">
                      第六段滚动内容，避免示例区只显示成一行普通文本。
                    </UiText>
                  </View>
                </ScrollShadow>
              </View>
            </View>
          </ShowcaseBlock>

          <ShowcaseBlock
            components={["card"]}
            description="Card 单独展示，避免它既当外层分组容器又当示例内容时产生混淆。"
            title="卡片容器"
          >
            <Card className="max-w-[420px] overflow-hidden border border-foreground/10 bg-background shadow-none">
              <View className="gap-1 px-4 pt-4">
                <CardTitle className="text-base font-semibold text-foreground">
                  Card 组件示例
                </CardTitle>
                <CardDescription className="text-sm text-foreground/60">
                  CardTitle、CardDescription 与 CardBody 一起构成典型卡片结构。
                </CardDescription>
              </View>
              <CardBody className="gap-3 px-4 pb-4">
                <UiText className="text-sm text-foreground/70">
                  这里是 CardBody 承载的正文内容。
                </UiText>
              </CardBody>
            </Card>
          </ShowcaseBlock>
        </View>
      </SectionCard>
    </View>
  );
}
