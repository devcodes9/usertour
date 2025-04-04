import { CalendarIcon, CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { UserIcon } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
// import * as Popover from "@radix-ui/react-popover";
import * as Popover from '@usertour-ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-ui/select';
import { cn } from '@usertour-ui/ui-utils';
import { format } from 'date-fns';
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { Button } from '@usertour-ui/button';
import { Calendar } from '@usertour-ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-ui/command';
import { EXTENSION_CONTENT_RULES } from '@usertour-ui/constants';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { getUserAttrError } from '@usertour-ui/shared-utils';
import {
  Attribute,
  AttributeDataType,
  RulesUserAttributeData,
  RulesUserAttributeProps,
} from '@usertour-ui/types';
import { useRulesContext } from '.';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesLogic } from './rules-logic';
import { RulesPopover, RulesPopoverContent, RulesPopoverTrigger } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';

export const conditionsTypeMapping = {
  [AttributeDataType.Number]: [
    { value: 'is', name: 'is' },
    { value: 'not', name: 'is not' },
    { value: 'isLessThan', name: 'is less than' },
    { value: 'isLessThanOrEqualTo', name: 'is less than or equal to' },
    { value: 'isGreaterThan', name: 'is greater than' },
    { value: 'isGreaterThanOrEqualTo', name: 'is greater than or equal to' },
    { value: 'between', name: 'is between' },
    { value: 'any', name: 'has any value' },
    { value: 'empty', name: 'is empty' },
  ],
  [AttributeDataType.String]: [
    { value: 'is', name: 'is' },
    { value: 'not', name: 'is not' },
    { value: 'contains', name: 'contains' },
    { value: 'notContain', name: 'does not contain' },
    { value: 'startsWith', name: 'starts with' },
    { value: 'endsWith', name: 'ends with' },
    { value: 'any', name: 'has any value' },
    { value: 'empty', name: 'is empty' },
  ],
  [AttributeDataType.Boolean]: [
    { value: 'true', name: 'is true' },
    { value: 'false', name: 'is false' },
    { value: 'any', name: 'has any value' },
    { value: 'empty', name: 'is empty' },
  ],
  [AttributeDataType.List]: [
    { value: 'includesAtLeastOne', name: 'includes at least one of' },
    { value: 'includesAll', name: 'includes all of' },
    {
      value: 'notIncludesAtLeastOne',
      name: 'does not include at least one of',
    },
    { value: 'notIncludesAll', name: 'does not include all of' },
    { value: 'any', name: 'has any value' },
    { value: 'empty', name: 'is empty' },
  ],
  [AttributeDataType.DateTime]: [
    { value: 'lessThan', name: 'less than', display: 'less than ... days ago' },
    { value: 'exactly', name: 'exactly', display: 'exactly ... days ago' },
    { value: 'moreThan', name: 'more than', display: 'more than ... days ago' },
    { value: 'before', name: 'before', display: 'before a specific date' },
    { value: 'on', name: 'on', display: 'on a specific date' },
    { value: 'after', name: 'after', display: 'after a specific date' },
    { value: 'any', name: 'has any value' },
    { value: 'empty', name: 'is empty' },
  ],
};

interface RulesUserAttributeContextValue {
  type: string;
  selectedPreset: Attribute | null;
  setSelectedPreset: Dispatch<SetStateAction<Attribute | null>>;
  activeConditionMapping: (typeof conditionsTypeMapping)[AttributeDataType.DateTime];
  setActiveConditionMapping: Dispatch<
    SetStateAction<(typeof conditionsTypeMapping)[AttributeDataType.DateTime]>
  >;
  localData: RulesUserAttributeData | undefined;
  updateLocalData: (updates: RulesUserAttributeData) => void;
}

const RulesUserAttributeContext = createContext<RulesUserAttributeContextValue | undefined>(
  undefined,
);

function useRulesUserAttributeContext(): RulesUserAttributeContextValue {
  const context = useContext(RulesUserAttributeContext);
  if (!context) {
    throw new Error(
      'useRulesUserAttributeContext must be used within a RulesUserAttributeContext.',
    );
  }
  return context;
}

const RulesAttributeDatePicker = (props: {
  date: Date | undefined;
  setDate: Dispatch<SetStateAction<Date | undefined>>;
}) => {
  const { date, setDate } = props;

  return (
    <Popover.Popover>
      <Popover.PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal h-9',
            !date && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'yyyy-MM-dd') : <span>Pick a date</span>}
        </Button>
      </Popover.PopoverTrigger>
      <Popover.PopoverContent
        className="w-auto p-0  z-50"
        align="start"
        style={{
          zIndex: EXTENSION_CONTENT_RULES,
        }}
      >
        <Calendar
          mode="single"
          defaultMonth={date}
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </Popover.PopoverContent>
    </Popover.Popover>
  );
};

const RulesUserAttributeName = () => {
  const [open, setOpen] = useState(false);
  const { selectedPreset, setSelectedPreset, updateLocalData } = useRulesUserAttributeContext();
  const { attributes } = useRulesContext();
  const { type } = useRulesUserAttributeContext();
  const handleOnSelected = (item: Attribute) => {
    setSelectedPreset(item);
    updateLocalData({ attrId: item.id });
    setOpen(false);
  };

  const handleFilter = useCallback(
    (value: string, search: string) => {
      if (attributes) {
        const attribute = attributes.find((attr) => attr.id === value);
        if (attribute?.displayName.includes(search)) {
          return 1;
        }
      }
      return 0;
    },
    [attributes],
  );
  return (
    <div className="flex flex-row">
      <Popover.Popover open={open} onOpenChange={setOpen}>
        <Popover.PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 justify-between ">
            {selectedPreset?.displayName}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </Popover.PopoverTrigger>
        <Popover.PopoverContent
          className="w-[350px] p-0"
          style={{ zIndex: EXTENSION_CONTENT_RULES }}
        >
          <Command filter={handleFilter}>
            <CommandInput placeholder="Search attribute..." />
            <CommandEmpty>No items found.</CommandEmpty>
            <ScrollArea className="h-72">
              {type === 'user-attr' && (
                <CommandGroup heading="User attribute" style={{ zIndex: EXTENSION_CONTENT_RULES }}>
                  {attributes
                    ?.filter((attr) => attr.bizType === 1)
                    .map((item) => (
                      <CommandItem
                        key={item.id}
                        className="cursor-pointer"
                        value={item.id}
                        onSelect={() => {
                          handleOnSelected(item);
                        }}
                      >
                        {item.displayName || item.codeName}
                        <CheckIcon
                          className={cn(
                            'ml-auto h-4 w-4',
                            selectedPreset?.id === item.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
              {type === 'company-attr' && (
                <CommandGroup
                  heading="Company attribute"
                  style={{ zIndex: EXTENSION_CONTENT_RULES }}
                >
                  {attributes
                    ?.filter((attr) => attr.bizType === 2)
                    .map((item) => (
                      <CommandItem
                        key={item.id}
                        className="cursor-pointer text-sm"
                        value={item.id}
                        onSelect={() => {
                          handleOnSelected(item);
                        }}
                      >
                        {item.displayName || item.codeName}
                        <CheckIcon
                          className={cn(
                            'ml-auto h-4 w-4',
                            selectedPreset?.id === item.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
            </ScrollArea>
          </Command>
        </Popover.PopoverContent>
      </Popover.Popover>
    </div>
  );
};

const RulesUserAttributeCondition = () => {
  const { localData, updateLocalData, activeConditionMapping } = useRulesUserAttributeContext();

  const handleConditionChange = (value: string) => {
    updateLocalData({ logic: value });
  };

  return (
    <>
      <Select defaultValue={localData?.logic} onValueChange={handleConditionChange}>
        <SelectTrigger className="justify-start flex h-9">
          <div className="grow text-left">
            <SelectValue placeholder={''} />
          </div>
        </SelectTrigger>
        <SelectPortal>
          <SelectContent style={{ zIndex: EXTENSION_CONTENT_RULES }}>
            {activeConditionMapping?.map((item, index) => {
              return (
                <SelectItem key={index} value={item.value} className="cursor-pointer">
                  {item.display || item.name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </SelectPortal>
      </Select>
    </>
  );
};

const RulesUserAttributeInput = () => {
  const { localData, updateLocalData, selectedPreset } = useRulesUserAttributeContext();
  const isDateTime =
    selectedPreset?.dataType === AttributeDataType.DateTime &&
    (localData?.logic === 'on' || localData?.logic === 'after' || localData?.logic === 'before');
  const [startDate, setStartDate] = useState<Date | undefined>(
    localData?.value && isDateTime ? new Date(localData?.value) : undefined,
  );
  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateLocalData({ value: e.target.value });
  };
  const handleOnChange2 = (e: ChangeEvent<HTMLInputElement>) => {
    updateLocalData({ value2: e.target.value });
  };
  const [inputType, setInputType] = useState<string>('');

  useEffect(() => {
    if (selectedPreset?.dataType === AttributeDataType.Number) {
      setInputType('number');
    } else {
      setInputType('text');
    }
  }, [selectedPreset]);

  useEffect(() => {
    if (isDateTime) {
      try {
        updateLocalData({
          value: startDate ? format(startDate, 'yyyy-MM-dd') : '',
        });
      } catch (_) {
        updateLocalData({ value: '' });
      }
    }
  }, [startDate, isDateTime]);

  if (isDateTime) {
    return (
      <div className="flex flex-row space-x-4 items-center">
        <RulesAttributeDatePicker date={startDate} setDate={setStartDate} />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-row space-x-4 items-center">
        {selectedPreset?.dataType !== AttributeDataType.Boolean &&
          localData?.logic !== 'empty' &&
          localData?.logic !== 'any' &&
          localData?.logic !== 'before' &&
          localData?.logic !== 'on' &&
          localData?.logic !== 'after' && (
            <Input
              type={inputType}
              value={localData?.value}
              onChange={handleOnChange}
              placeholder={''}
            />
          )}
        {localData?.logic === 'between' && (
          <>
            <span>and</span>
            <Input
              type={inputType}
              value={localData?.value2}
              onChange={handleOnChange2}
              placeholder={''}
            />
          </>
        )}
      </div>
    </>
  );
};

export const RulesUserAttribute = (props: RulesUserAttributeProps) => {
  const { index, data, type } = props;
  const { attributes, isHorizontal } = useRulesContext();
  const [selectedPreset, setSelectedPreset] = useState<Attribute | null>(null);
  const { updateConditionData } = useRulesGroupContext();
  const [openError, setOpenError] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeConditionMapping, setActiveConditionMapping] = useState<
    (typeof conditionsTypeMapping)[AttributeDataType.Number]
  >(conditionsTypeMapping[AttributeDataType.Number]);
  const [localData, setLocalData] = useState<RulesUserAttributeData | undefined>(data);
  const [errorInfo, setErrorInfo] = useState('');

  const [displayCondition, setDisplayCondition] = useState<string>('');
  const [displayValue, setDisplayValue] = useState<string>('');

  const [isUpdate, setIsUpdate] = useState(!data?.attrId);
  const { disabled } = useRulesContext();

  useEffect(() => {
    if (attributes && data?.attrId) {
      const item = attributes.find((item: Attribute) => item.id === data?.attrId);
      if (item) {
        setSelectedPreset(item);
        updateLocalData({ attrId: item.id });
      }
    }
  }, [attributes]);

  const updateLocalData = useCallback(
    (updates: RulesUserAttributeData) => {
      const data = localData ? { ...localData, ...updates } : { ...updates };
      setLocalData(data);
      setIsUpdate(true);
    },
    [localData],
  );

  useEffect(() => {
    if (!attributes) {
      return;
    }
    const { showError, errorInfo } = getUserAttrError(localData, attributes);
    if (!open && !showError) {
      updateConditionData(index, { ...localData });
    }
    if (isUpdate && !open && showError) {
      setErrorInfo(errorInfo);
      setOpenError(true);
    } else {
      setErrorInfo('');
      setOpenError(false);
    }
  }, [open, selectedPreset, localData, isUpdate]);

  useEffect(() => {
    if (selectedPreset?.dataType) {
      const t = selectedPreset.dataType as keyof typeof conditionsTypeMapping;
      setActiveConditionMapping(conditionsTypeMapping[t]);
    }
  }, [selectedPreset]);

  useEffect(() => {
    if (activeConditionMapping && activeConditionMapping.length > 0) {
      const mapping = activeConditionMapping.find((c) => c.value === localData?.logic);
      if (mapping) {
        setDisplayCondition(mapping.name);
      } else {
        setDisplayCondition(activeConditionMapping[0].name);
      }
    }
  }, [activeConditionMapping, localData?.logic]);

  useEffect(() => {
    if (
      localData?.logic !== 'empty' &&
      localData?.logic !== 'any' &&
      selectedPreset?.dataType !== AttributeDataType.Boolean &&
      localData?.value
    ) {
      setDisplayValue(localData?.value);
    } else {
      setDisplayValue('');
    }
  }, [localData, selectedPreset]);

  const value = {
    selectedPreset,
    setSelectedPreset,
    activeConditionMapping,
    setActiveConditionMapping,
    type,
    localData,
    updateLocalData,
  };

  return (
    <RulesUserAttributeContext.Provider value={value}>
      <RulesError open={openError}>
        <div className={cn('flex flex-row ', isHorizontal ? 'mr-1 mb-1 space-x-1 ' : 'space-x-3 ')}>
          <RulesLogic index={index} disabled={disabled} />
          <RulesErrorAnchor asChild>
            <RulesConditionRightContent disabled={disabled}>
              <RulesConditionIcon>
                <UserIcon width={16} height={16} />
              </RulesConditionIcon>
              <RulesPopover onOpenChange={setOpen} open={open}>
                <RulesPopoverTrigger className={cn(isHorizontal ? 'w-auto' : '')}>
                  <span className="font-bold">{selectedPreset?.displayName} </span>
                  {displayCondition} <span className="font-bold ">{displayValue}</span>
                  {localData?.logic === 'between' && (
                    <>
                      <span className="mx-1">and</span>
                      <span className="font-bold ">{localData?.value2}</span>
                    </>
                  )}
                </RulesPopoverTrigger>
                <RulesPopoverContent>
                  <div className=" flex flex-col space-y-2">
                    <div className=" flex flex-col space-y-1">
                      <div>
                        {type === 'user-attr' && 'User attribute'}
                        {type === 'company-attr' && 'Company attribute'}
                      </div>
                      <RulesUserAttributeName />
                      <RulesUserAttributeCondition />
                      <RulesUserAttributeInput />
                    </div>
                  </div>
                </RulesPopoverContent>
              </RulesPopover>
              <RulesRemove index={index} />
            </RulesConditionRightContent>
          </RulesErrorAnchor>
          <RulesErrorContent>{errorInfo}</RulesErrorContent>
        </div>
      </RulesError>
    </RulesUserAttributeContext.Provider>
  );
};

RulesUserAttribute.displayName = 'RulesUserAttribute';
