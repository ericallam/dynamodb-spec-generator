interface AllEmployeeDetailsByEmployeeNameItemAttributes {
  info: string;
  name: string;
  id?: string;
}

interface AllEmployeeDetailsByEmployeeNameItemOther {
  [key: string]: any;
}

export type AllEmployeeDetailsByEmployeeNameItem = AllEmployeeDetailsByEmployeeNameItemAttributes &
  AllEmployeeDetailsByEmployeeNameItemOther;

export const allEmployeeDetailsByEmployeeName = async (
  info: string,
  name: string,
  documentClient: any
): Promise<AllEmployeeDetailsByEmployeeNameItem[]> => {
  const params: any = {};

  params.KeyConditionExpression = "#SK = :SK and begins_with(#Data, :Data)";

  const expressionAttributeNames = {};
  expressionAttributeNames["#SK"] = "SK";
  expressionAttributeNames["#Data"] = "Data";
  params.ExpressionAttributeNames = expressionAttributeNames;

  const expressionAttributeValues = {};
  expressionAttributeValues[":SK"] = info;
  expressionAttributeValues[":Data"] = name;
  params.ExpressionAttributeValues = expressionAttributeValues;

  params.IndexName = "gsi1";
  const response = await documentClient.query(params);

  const mapItemAttributes = item => {
    const result = { ...item };

    result["info"] = result["SK"];
    delete result["SK"];

    result["name"] = result["Data"];
    delete result["Data"];

    result["id"] = result["PK"];
    delete result["PK"];

    return result;
  };

  return response.Items.map(mapItemAttributes);
};
