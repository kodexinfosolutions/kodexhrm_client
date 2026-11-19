import React, { useState } from 'react';
import { Select, Input, Button, message } from 'antd';

const AddNewDropdown = ({
  options = [], // { label: string, value: string }
  value,
  onChange,
  onAddNew, // async function that takes string, creates in DB, and returns the newly created item or true.
  placeholder = "Select...",
  newItemPlaceholder = "Enter new value",
  loading = false,
  className = "",
  disabled = false,
}) => {
  const [newValue, setNewValue] = useState("");

  const extendedOptions = [
    ...options,
    { value: "OTHER", label: "Other (Add New)" },
  ];

  const handleSelectChange = (val) => {
    onChange?.(val);
    if (val !== "OTHER") {
      setNewValue("");
    }
  };

  const handleAdd = async () => {
    const trimmed = newValue.trim();
    if (!trimmed) {
      message.error("Value cannot be empty");
      return;
    }

    // Case-insensitive check
    const duplicate = options.find(
      (opt) => opt.label.toLowerCase() === trimmed.toLowerCase()
    );

    if (duplicate) {
      // Auto-select the existing option
      handleSelectChange(duplicate.value);
      return;
    }

    try {
      await onAddNew(trimmed);
      setNewValue("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* For compatibility with Tailwind classes from the parent, we remove AntD default borders if we wrap it, 
          but AntD Select is better used as is. We'll use AntD's rootClassName to style it like the native selects. */}
      <Select
        value={value || undefined}
        onChange={handleSelectChange}
        options={extendedOptions}
        placeholder={placeholder}
        disabled={disabled}
        showSearch
        optionFilterProp="label"
        style={{ width: '100%', height: '40px' }}
        className="[&_.ant-select-selector]:!bg-surface-container-high [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-none"
      />

      {value === "OTHER" && (
        <div className="flex gap-2 items-center mt-2 bg-surface-container-high p-1 rounded-xl">
          <Input
            autoFocus
            placeholder={newItemPlaceholder}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onPressEnter={handleAdd}
            disabled={loading}
            className="border-none bg-transparent shadow-none focus:ring-0"
          />
          <Button
            type="primary"
            onClick={handleAdd}
            loading={loading}
            className="rounded-lg bg-primary hover:bg-primary/90"
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
};

export default AddNewDropdown;
