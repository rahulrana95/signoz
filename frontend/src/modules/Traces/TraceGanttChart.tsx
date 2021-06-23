import React, { useEffect, useRef, useState } from "react";
import { Table, Progress, Tabs, Button, Row, Col } from "antd";
import "./Collapse.css";
import { max, isEmpty, has } from "lodash-es";
import styled from "styled-components";
import getTreeData from "Src/modules/Traces/TraceGantChartHelpers";
import { pushDStree } from "../../store/actions";

const { TabPane } = Tabs;

const StyledButton = styled(Button)`
	border: 1px solid #e0e0e0;
	border-radius: 4px;
	color: #f2f2f2;
	font-size: 14px;
	line-height: 20px;
`;

interface TraceGanttChartProps {
	treeData: pushDStree;
	clickedSpan: pushDStree;
	selectedSpan: pushDStree;
	resetZoom: () => {};
	setSpanTagsInfo: () => {};
}

const TraceGanttChart = ({
	treeData,
	clickedSpan,
	selectedSpan,
	resetZoom,
	setSpanTagsInfo,
}: TraceGanttChartProps) => {
	let checkStrictly = false;
	const [selectedRows, setSelectedRows] = useState([]);
	const [clickedSpanData, setClickedSpanData] = useState(clickedSpan);
	const [defaultExpandedRows, setDefaultExpandedRows] = useState([]);
	const [sortedTreeData, setSortedTreeData] = useState(treeData);
	const [isReset, setIsReset] = useState(false);
	const [rowId, setRowId] = useState(0);
	const tableRef = useRef("");
	let tabsContainerWidth = document.querySelector(
		"#collapsable .ant-tabs-nav-list",
	)?.offsetWidth;
	let tabs = document.querySelectorAll("#collapsable .ant-tabs-tab");
	let secondTabLeftOffset = tabs[1]?.offsetLeft;

	const { id } = treeData || "id";
	let maxGlobal = 0;
	let minGlobal = 0;
	let medianGlobal = 0;
	let endTimeArray: [] = [];

	useEffect(() => {
		if (id !== "empty") {
			setSortedTreeData(treeData);
			if (clickedSpan) {
				setClickedSpanData(clickedSpan);
			}
		}
		// handleScroll(selectedSpan?.id);
	}, [sortedTreeData, treeData, clickedSpan]);

	useEffect(() => {
		if (
			!isEmpty(clickedSpanData) &&
			clickedSpan &&
			!selectedRows.includes(clickedSpan.id)
		) {
			setSelectedRows([clickedSpan.id]);
			getParentKeys(clickedSpan);
			let keys = [clickedSpan?.id, ...parentKeys];
			// setDefaultExpandedRows(keys)
			handleFocusOnSelectedPath("", [clickedSpan.id], clickedSpan);
		}
	}, [clickedSpan, selectedRows, isReset, clickedSpanData]);

	let parentKeys = [];
	const getParentKeys = (obj) => {
		if (has(obj, "parent")) {
			parentKeys.push(obj.parent.id);
			getParentKeys(obj.parent);
		}
	};

	useEffect(() => {
		if (!isEmpty(selectedSpan) && isEmpty(clickedSpan)) {
			getParentKeys(selectedSpan);
			let keys = [selectedSpan?.id, ...parentKeys];
			setDefaultExpandedRows(keys);
			setSelectedRows([selectedSpan.id, clickedSpan]);
		} else {
			setSelectedRows([]);
		}
	}, [selectedSpan]);

	const getMaxEndTime = (treeData) => {
		if (treeData.length > 0) {
			if (treeData?.id !== "empty") {
				return Array.from(treeData).map((item, key) => {
					if (!isEmpty(item.children)) {
						endTimeArray.push(item.time / 1000000 + item.startTime);
						getMaxEndTime(item.children);
					} else {
						endTimeArray.push(item.time / 1000000 + item.startTime);
					}
				});
			}
		}
	};

	if (id !== "empty") {
		getMaxEndTime(treeData);
		maxGlobal = max(endTimeArray);
		minGlobal = treeData?.[0]?.startTime;
		medianGlobal = (minGlobal + maxGlobal) / 2;
	}

	const getPaddingLeft = (value, totalWidth, leftOffset = 0) => {
		return ((value / totalWidth) * 100 + leftOffset).toFixed(0);
	};

	let tabMinVal = 0;
	let tabMedianVal = (medianGlobal - minGlobal).toFixed(0);
	let tabMaxVal = (maxGlobal - minGlobal).toFixed(0);

	const columns = [
		{
			title: "",
			dataIndex: "name",
			key: "name",
		},
		{
			title: (
				<Tabs>
					<TabPane tab={tabMinVal + "ms"} key="1" />
					<TabPane tab={tabMedianVal + "ms"} key="2" />
					<TabPane tab={tabMaxVal + "ms"} key="3" />
				</Tabs>
			),
			dataIndex: "trace",
			name: "trace",
			render: (_, record: pushDStree) => {
				let widths = [];
				let length;

				if (widths.length < tabs.length) {
					Array.from(tabs).map((tab) => {
						widths.push(tab.offsetWidth);
					});
				}

				let paddingLeft = 0;
				let startTime = record.startTime;
				let duration = (record.time / 1000000).toFixed(2);

				if (startTime < medianGlobal) {
					paddingLeft = getPaddingLeft(startTime - minGlobal, tabsContainerWidth);
				} else if (startTime >= medianGlobal && startTime < maxGlobal) {
					paddingLeft = getPaddingLeft(
						widths[0] + (startTime - medianGlobal),
						tabsContainerWidth,
						secondTabLeftOffset,
					);
				}

				length = ((record.time / 1000000 / (maxGlobal - minGlobal)) * 100).toFixed(
					2,
				);

				return (
					<>
						<div style={{ paddingLeft: paddingLeft + "px" }}>{duration}ms</div>
						<Progress
							percent={length}
							showInfo={false}
							style={{ paddingLeft: paddingLeft + "px" }}
						/>
					</>
				);
			},
		},
	];

	const handleFocusOnSelectedPath = (event, selectedRowsList = selectedRows) => {
		if (!isEmpty(selectedRowsList)) {
			let node: pushDStree = getTreeData(
				treeData,
				(item: pushDStree) => item.id === selectedRowsList[0],
				1,
			);
			setSpanTagsInfo({ data: node[0] });

			getParentKeys(node[0]);
			let keys = [node[0]?.id, ...parentKeys];
			setDefaultExpandedRows(keys);

			let rows = document.querySelectorAll("#collapsable table tbody tr");
			Array.from(rows).map((row) => {
				let attribKey = row.getAttribute("data-row-key");
				if (!selectedRowsList.includes(attribKey)) {
					row.classList.add("hide");
				}
			});
			setDefaultExpandedRows(keys);
		}
	};

	const handleResetFocus = () => {
		let rows = document.querySelectorAll("#collapsable table tbody tr");
		Array.from(rows).map((row) => {
			row.classList.remove("hide");
		});

		resetZoom(true);
	};

	// const handleScroll = (id) => {
	// 	let rows = document.querySelectorAll("#collapsable table tbody tr");
	// 	const table = document.querySelectorAll("#collapsable table");
	// 	Array.from(rows).map((row) => {
	// 		let attribKey = row.getAttribute("data-row-key");
	// 		if (id === attribKey) {
	// 			let scrollValue = table[1].offsetTop - row.offsetHeight;
	// 			table[1].scrollTop = scrollValue;
	// 		}
	// 	});
	// };

	const rowSelection = {
		onChange: (selectedRowKeys: [], selectedRows: []) => {
			if (isEmpty(selectedRowKeys)) {
				setIsReset(true);
				setClickedSpanData({});
			} else {
				setIsReset(false);
			}
			setSelectedRows(selectedRowKeys);
		},
		selectedRowKeys: selectedRows,
	};

	// const handleRowOnClick = (record) => {
	// 	setRowId(record.id);
	//
	// 	// const selectedRowKeys = selectedRows;
	// 	// if (selectedRowKeys.indexOf(record.id) >= 0) {
	// 	// 	selectedRowKeys.splice(selectedRowKeys.indexOf(record.key), 1);
	// 	// } else {
	// 	// 	selectedRowKeys.push(record.id);
	// 	// }
	// 	setSelectedRows([record.id]);
	// 	// console.log("selectedRowKeys", selectedRowKeys)
	// 	handleFocusOnSelectedPath("", [record.id], record);
	// };

	const setRowClassName = (record) => {
		return record.id === rowId ? "selectedRowStyles" : "";
	};

	const handleOnExpandedRowsChange = (item) => {
		setDefaultExpandedRows(item);
	};

	return (
		<>
			{id !== "empty" && (
				<>
					<Row
						justify="end"
						gutter={32}
						style={{
							marginBottom: "24px",
						}}
					>
						<Col>
							<StyledButton onClick={handleFocusOnSelectedPath}>
								{" "}
								Focus on selected path{" "}
							</StyledButton>
						</Col>
						<Col>
							<StyledButton onClick={handleResetFocus}> Reset Focus </StyledButton>
						</Col>
					</Row>

					<Table
						refs={tableRef}
						checkStrictly={true}
						hideSelectAll={true}
						columns={columns}
						rowSelection={{ ...rowSelection, checkStrictly }}
						dataSource={sortedTreeData}
						rowKey="id"
						sticky={true}
						// onRow={(record, rowIndex) => {
						// 	return {
						// 		onClick: () => handleRowOnClick(record, rowIndex), // click row
						// 	};
						// }}
						rowClassName={setRowClassName}
						expandedRowKeys={defaultExpandedRows}
						onExpandedRowsChange={handleOnExpandedRowsChange}
						scroll={{ y: 640 }}
						pagination={false}
					/>
				</>
			)}
		</>
	);
};

export default TraceGanttChart;
