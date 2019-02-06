interface GetEmployeeDetailsByEmployeeIdItemAttributes {
  id: string;
  info: string;
  name?: string;
}

interface GetEmployeeDetailsByEmployeeIdItemOther {
  [key: string]: any;
}

export type GetEmployeeDetailsByEmployeeIdItem = GetEmployeeDetailsByEmployeeIdItemAttributes &
  GetEmployeeDetailsByEmployeeIdItemOther;

export type GetEmployeeDetailsByEmployeeIdResult = GetEmployeeDetailsByEmployeeIdItem | null;

export const getEmployeeDetailsByEmployeeId = async (
  id: string,
  info: string,
  documentClient: any
): Promise<GetEmployeeDetailsByEmployeeIdResult> => {
  const params: any = {};

  params.Key = {
    PK: id,
    SK: info
  };

  const response = await documentClient.get(params);

  if (!response.Item) {
    return null;
  }

  const mapItemAttributes = item => {
    const result = { ...item };

    result["id"] = result["PK"];
    delete result["PK"];

    result["info"] = result["SK"];
    delete result["SK"];

    result["name"] = result["Data"];
    delete result["Data"];

    return result;
  };

  return mapItemAttributes(response.Item);
};
