interface ShowAllOpenOrdersBetweenItemAttributes {
  bucket: any;
  status: string;
  id?: string;
  info?: string;
}

interface ShowAllOpenOrdersBetweenItemOther {
  [key: string]: any;
}

export type ShowAllOpenOrdersBetweenItem = ShowAllOpenOrdersBetweenItemAttributes &
  ShowAllOpenOrdersBetweenItemOther;

export const showAllOpenOrdersBetween = async (
  bucket: any,
  statusMin: string,
  statusMax: string,
  documentClient: any
): Promise<ShowAllOpenOrdersBetweenItem[]> => {
  const params: any = {};

  params.KeyConditionExpression =
    "#GSI-Bucket = :GSI-Bucket and #Data BETWEEN :DataMin AND :DataMax";

  const expressionAttributeNames = {};
  expressionAttributeNames["#GSI-Bucket"] = "GSI-Bucket";
  expressionAttributeNames["#Data"] = "Data";
  params.ExpressionAttributeNames = expressionAttributeNames;

  const expressionAttributeValues = {};
  expressionAttributeValues[":GSI-Bucket"] = bucket;

  expressionAttributeValues[":DataMin"] = statusMin;
  expressionAttributeValues[":DataMax"] = statusMax;

  params.ExpressionAttributeValues = expressionAttributeValues;

  params.IndexName = "gsi2";
  const response = await documentClient.query(params);

  const mapItemAttributes = item => {
    const result = { ...item };

    result["bucket"] = result["GSI-Bucket"];
    delete result["GSI-Bucket"];

    result["status"] = result["Data"];
    delete result["Data"];

    result["id"] = result["PK"];
    delete result["PK"];

    result["info"] = result["SK"];
    delete result["SK"];

    return result;
  };

  return response.Items.map(mapItemAttributes);
};
