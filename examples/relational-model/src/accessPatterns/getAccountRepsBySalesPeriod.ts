interface GetAccountRepsBySalesPeriodItemAttributes {
  salesPeriod: string;
  orderTotal: string;
  employeeID?: string;
}

interface GetAccountRepsBySalesPeriodItemOther {
  [key: string]: any;
}

export type GetAccountRepsBySalesPeriodItem = GetAccountRepsBySalesPeriodItemAttributes &
  GetAccountRepsBySalesPeriodItemOther;

export const getAccountRepsBySalesPeriod = async (
  salesPeriod: string,
  documentClient: any
): Promise<GetAccountRepsBySalesPeriodItem[]> => {
  const params: any = {};

  params.KeyConditionExpression = "#SK = :SK";

  const expressionAttributeNames = {};
  expressionAttributeNames["#SK"] = "SK";
  params.ExpressionAttributeNames = expressionAttributeNames;

  const expressionAttributeValues = {};
  expressionAttributeValues[":SK"] = salesPeriod;

  params.ExpressionAttributeValues = expressionAttributeValues;

  params.ScanIndexFoward = false;
  params.IndexName = "gsi1";
  const response = await documentClient.query(params);

  const mapItemAttributes = item => {
    const result = { ...item };

    result["salesPeriod"] = result["SK"];
    delete result["SK"];

    result["orderTotal"] = result["Data"];
    delete result["Data"];

    result["employeeID"] = result["PK"];
    delete result["PK"];

    return result;
  };

  return response.Items.map(mapItemAttributes);
};
