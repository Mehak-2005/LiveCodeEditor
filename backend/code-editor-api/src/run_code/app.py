import ast
import json
import os
import re
import subprocess
import sys
import tempfile
import textwrap
import uuid

from decimal import Decimal

import boto3


# =========================================================
# AWS CLIENTS
# =========================================================

dynamodb = boto3.resource("dynamodb")

lambda_client = boto3.client("lambda")


# =========================================================
# ENVIRONMENT VARIABLES
# =========================================================

QUESTION_TABLE_NAME = os.environ.get(
    "QUESTION_TABLE"
)

JAVA_EXECUTOR_FUNCTION_NAME = os.environ.get(
    "JAVA_EXECUTOR_FUNCTION_NAME"
)


# =========================================================
# EXECUTION SETTINGS
# =========================================================

EXECUTION_TIMEOUT = 3


# =========================================================
# LAMBDA ENTRY POINT
# =========================================================

def lambda_handler(event, context):

    try:

        # -------------------------------------------------
        # Read request body
        # -------------------------------------------------

        body = get_request_body(event)

        language = body.get("language")

        code = body.get("code")

        question_id = body.get("questionId")


        # -------------------------------------------------
        # Validate language
        # -------------------------------------------------

        if not language:

            return response(
                400,
                {
                    "success": False,
                    "error": "Language is required"
                }
            )


        language = language.lower().strip()


        if language not in ["python", "java"]:

            return response(
                400,
                {
                    "success": False,
                    "error": (
                        "Only Python and Java are supported"
                    )
                }
            )


        # -------------------------------------------------
        # Validate code
        # -------------------------------------------------

        if not code or not code.strip():

            return response(
                400,
                {
                    "success": False,
                    "error": "Code is required"
                }
            )


        # -------------------------------------------------
        # Validate question ID
        # -------------------------------------------------

        if not question_id:

            return response(
                400,
                {
                    "success": False,
                    "error": "Question ID is required"
                }
            )


        # -------------------------------------------------
        # Load question from DynamoDB
        # -------------------------------------------------

        question = get_question_from_dynamodb(
            question_id
        )


        if not question:

            return response(
                404,
                {
                    "success": False,
                    "questionId": question_id,
                    "error": (
                        f"Question '{question_id}' "
                        "was not found."
                    )
                }
            )


        # -------------------------------------------------
        # Validate supported language
        # -------------------------------------------------

        supported_languages = question.get(
            "languages",
            []
        )


        if language not in supported_languages:

            return response(
                400,
                {
                    "success": False,
                    "questionId": question_id,
                    "error": (
                        f"Language '{language}' "
                        f"is not supported for "
                        f"question '{question_id}'."
                    ),
                    "supportedLanguages":
                        supported_languages
                }
            )


        # -------------------------------------------------
        # Get test cases from DynamoDB
        # -------------------------------------------------

        test_cases = get_test_cases_from_question(
            question
        )


        if not test_cases:

            return response(
                500,
                {
                    "success": False,
                    "questionId": question_id,
                    "error": (
                        "No valid test cases are "
                        "configured for this question."
                    )
                }
            )


        # =================================================
        # GET GENERIC EXECUTION CONFIGURATION
        # =================================================

        execution_config = get_execution_config(
            question,
            language
        )


        # =================================================
        # PYTHON EXECUTION
        # =================================================

        if language == "python":

            results = run_python_code(
                code=code,
                question=question,
                test_cases=test_cases,
                execution_config=execution_config
            )


            passed_count = sum(
                1
                for result in results
                if result.get("passed") is True
            )


            return response(
                200,
                {
                    "success":
                        passed_count == len(test_cases),

                    "questionId":
                        question_id,

                    "language":
                        "python",

                    "totalTestCases":
                        len(test_cases),

                    "passedTestCases":
                        passed_count,

                    "failedTestCases":
                        len(test_cases) - passed_count,

                    "results":
                        results
                }
            )


        # =================================================
        # JAVA EXECUTION
        # =================================================

        if language == "java":

            return run_java_code(
                code=code,
                question=question,
                question_id=question_id,
                test_cases=test_cases,
                execution_config=execution_config
            )


        # -------------------------------------------------
        # Unsupported language
        # -------------------------------------------------

        return response(
            400,
            {
                "success": False,
                "error": "Unsupported language"
            }
        )


    except Exception as error:

        return response(
            500,
            {
                "success": False,
                "error": str(error)
            }
        )


# =========================================================
# GET QUESTION FROM DYNAMODB
# =========================================================

def get_question_from_dynamodb(question_id):

    if not QUESTION_TABLE_NAME:

        raise RuntimeError(
            "QUESTION_TABLE environment variable "
            "is not configured."
        )


    table = dynamodb.Table(
        QUESTION_TABLE_NAME
    )


    result = table.get_item(
        Key={
            "questionId": question_id
        }
    )


    item = result.get("Item")


    if not item:

        return None


    return convert_dynamodb_types(item)


# =========================================================
# CONVERT DYNAMODB TYPES
# =========================================================

def convert_dynamodb_types(value):

    if isinstance(value, Decimal):

        if value % 1 == 0:

            return int(value)

        return float(value)


    if isinstance(value, list):

        return [
            convert_dynamodb_types(item)
            for item in value
        ]


    if isinstance(value, dict):

        return {
            key:
                convert_dynamodb_types(item)

            for key, item in value.items()
        }


    return value


# =========================================================
# GET TEST CASES FROM QUESTION
# =========================================================

def get_test_cases_from_question(question):

    stored_test_cases = question.get(
        "testCases",
        []
    )


    if not isinstance(
        stored_test_cases,
        list
    ):

        raise ValueError(
            "Question testCases must be a list."
        )


    test_cases = []


    for index, test_case in enumerate(
        stored_test_cases,
        start=1
    ):

        if not isinstance(
            test_case,
            dict
        ):

            continue


        input_data = test_case.get(
            "input",
            {}
        )


        if not isinstance(
            input_data,
            dict
        ):

            continue


        expected_output = test_case.get(
            "expectedOutput"
        )


        if expected_output is None:

            continue


        # -------------------------------------------------
        # IMPORTANT:
        #
        # Do NOT assume nums/target.
        #
        # Different questions can have completely
        # different input fields.
        # -------------------------------------------------

        test_cases.append(
            {
                "id":
                    test_case.get(
                        "id",
                        index
                    ),

                "input":
                    input_data,

                "expectedOutput":
                    expected_output
            }
        )


    return test_cases


# =========================================================
# GENERIC EXECUTION CONFIGURATION
# =========================================================

def get_execution_config(
    question,
    language
):

    # -----------------------------------------------------
    # First try explicit execution metadata.
    #
    # Recommended future DynamoDB structure:
    #
    # execution:
    #   java:
    #       methodName
    #       parameterTypes
    #       inputFields
    #       returnType
    #
    # -----------------------------------------------------

    execution = question.get(
        "execution",
        {}
    )


    if isinstance(
        execution,
        dict
    ):

        language_execution = execution.get(
            language
        )


        if isinstance(
            language_execution,
            dict
        ):

            config = normalize_execution_config(
                language_execution
            )


            if config:

                return config


    # -----------------------------------------------------
    # Backward-compatible derivation.
    #
    # This means your CURRENT Two Sum DynamoDB item
    # can continue working without adding execution
    # metadata immediately.
    # -----------------------------------------------------

    if language == "java":

        return derive_java_execution_config(
            question
        )


    if language == "python":

        return derive_python_execution_config(
            question
        )


    raise ValueError(
        f"Unsupported execution language: {language}"
    )


# =========================================================
# NORMALIZE EXECUTION CONFIG
# =========================================================

def normalize_execution_config(
    config
):

    if not isinstance(
        config,
        dict
    ):

        return {}


    method_name = config.get(
        "methodName"
    )


    parameter_types = config.get(
        "parameterTypes",
        []
    )


    input_fields = config.get(
        "inputFields",
        []
    )


    return_type = config.get(
        "returnType"
    )


    if not isinstance(
        parameter_types,
        list
    ):

        parameter_types = []


    if not isinstance(
        input_fields,
        list
    ):

        input_fields = []


    result = {

        "methodName":
            method_name,

        "parameterTypes":
            [
                str(value)
                for value in parameter_types
            ],

        "inputFields":
            [
                str(value)
                for value in input_fields
            ],

        "returnType":
            return_type
    }


    if (
        result["methodName"]
        and result["parameterTypes"]
        and result["inputFields"]
        and
        len(result["parameterTypes"])
        ==
        len(result["inputFields"])
    ):

        return result


    return {}


# =========================================================
# DERIVE JAVA EXECUTION CONFIG
# =========================================================

def derive_java_execution_config(
    question
):

    function_signature = question.get(
        "functionSignature",
        {}
    )


    starter_code = question.get(
        "starterCode",
        {}
    )


    if not isinstance(
        function_signature,
        dict
    ):

        function_signature = {}


    if not isinstance(
        starter_code,
        dict
    ):

        starter_code = {}


    signature = function_signature.get(
        "java",
        ""
    )


    starter = starter_code.get(
        "java",
        ""
    )


    if not signature:

        raise ValueError(
            "Java function signature is not "
            "configured for this question."
        )


    # -----------------------------------------------------
    # Example:
    #
    # twoSum(int[] nums, int target)
    #
    # becomes:
    #
    # methodName:
    #   twoSum
    #
    # parameterTypes:
    #   int[]
    #   int
    #
    # inputFields:
    #   nums
    #   target
    # -----------------------------------------------------

    method_match = re.search(
        r"^\s*"
        r"([A-Za-z_$][A-Za-z0-9_$]*)"
        r"\s*\("
        r"(.*)"
        r"\)\s*$",
        signature.strip(),
        re.DOTALL
    )


    if not method_match:

        raise ValueError(
            f"Invalid Java function signature: "
            f"{signature}"
        )


    method_name = method_match.group(
        1
    )


    parameter_text = method_match.group(
        2
    ).strip()


    parameter_types = []

    input_fields = []


    if parameter_text:

        parameters = split_java_parameters(
            parameter_text
        )


        for parameter in parameters:

            parts = parameter.strip().split()


            if len(parts) < 2:

                raise ValueError(
                    "Unable to parse Java "
                    f"parameter: {parameter}"
                )


            parameter_name = parts[-1]


            parameter_type = " ".join(
                parts[:-1]
            )


            parameter_types.append(
                parameter_type
            )


            input_fields.append(
                parameter_name
            )


    # -----------------------------------------------------
    # Return type comes from trusted starter code.
    # -----------------------------------------------------

    return_type = extract_java_return_type(
        starter,
        method_name
    )


    if not return_type:

        raise ValueError(
            "Unable to determine return type "
            f"for Java method '{method_name}'."
        )


    return {

        "methodName":
            method_name,

        "parameterTypes":
            parameter_types,

        "inputFields":
            input_fields,

        "returnType":
            return_type
    }


# =========================================================
# SPLIT JAVA PARAMETERS
# =========================================================

def split_java_parameters(
    parameter_text
):

    parameters = []

    current = []

    angle_depth = 0


    for char in parameter_text:

        if char == "<":

            angle_depth += 1


        elif (
            char == ">"
            and angle_depth > 0
        ):

            angle_depth -= 1


        if (
            char == ","
            and angle_depth == 0
        ):

            parameters.append(
                "".join(
                    current
                ).strip()
            )

            current = []

        else:

            current.append(
                char
            )


    if current:

        parameters.append(
            "".join(
                current
            ).strip()
        )


    return parameters


# =========================================================
# EXTRACT JAVA RETURN TYPE
# =========================================================

def extract_java_return_type(
    starter_code,
    method_name
):

    if not starter_code:

        return None


    pattern = re.compile(

        r"\b"
        r"(?:public|protected|private)?\s*"
        r"(?:static\s+)?"

        r"([A-Za-z_$][\w$]*"
        r"(?:\s*<[^>{}]+>)?"
        r"(?:\s*\[\])*)"

        r"\s+"

        + re.escape(
            method_name
        )

        + r"\s*\(",

        re.MULTILINE
    )


    match = pattern.search(
        starter_code
    )


    if not match:

        return None


    return re.sub(
        r"\s+",
        "",
        match.group(1)
    )


# =========================================================
# JAVA EXECUTION
# =========================================================

def run_java_code(
    code,
    question,
    question_id,
    test_cases,
    execution_config
):

    # -----------------------------------------------------
    # Verify Java Executor Lambda
    # -----------------------------------------------------

    if not JAVA_EXECUTOR_FUNCTION_NAME:

        return response(
            500,
            {
                "success": False,
                "questionId":
                    question_id,

                "language":
                    "java",

                "error": (
                    "JAVA_EXECUTOR_FUNCTION_NAME "
                    "environment variable is not configured."
                ),

                "results": []
            }
        )


    # -----------------------------------------------------
    # Get starter code
    # -----------------------------------------------------

    starter_code = question.get(
        "starterCode",
        {}
    )


    if not isinstance(
        starter_code,
        dict
    ):

        starter_code = {}


    java_starter_code = starter_code.get(
        "java",
        ""
    )


    # -----------------------------------------------------
    # Get function signature
    # -----------------------------------------------------

    function_signature = question.get(
        "functionSignature",
        {}
    )


    if not isinstance(
        function_signature,
        dict
    ):

        function_signature = {}


    java_function_signature = function_signature.get(
        "java",
        ""
    )


    if not java_starter_code:

        return response(
            500,
            {
                "success": False,
                "questionId":
                    question_id,

                "language":
                    "java",

                "error": (
                    "Java starterCode is not "
                    "configured for this question."
                ),

                "results": []
            }
        )


    # =====================================================
    # PAYLOAD FOR JAVA EXECUTOR
    # =====================================================

    payload = {

        "questionId":
            question_id,

        "code":
            code,

        "starterCode":
            java_starter_code,

        "functionSignature":
            java_function_signature,

        # -------------------------------------------------
        # IMPORTANT:
        #
        # We now send the original generic test case
        # structure instead of hard-coding nums/target.
        # -------------------------------------------------

        "testCases":
            test_cases,

        # -------------------------------------------------
        # IMPORTANT:
        #
        # This tells JavaExecutor:
        #
        # methodName
        # parameterTypes
        # inputFields
        # returnType
        # -------------------------------------------------

        "execution":
            execution_config
    }


    try:

        # -------------------------------------------------
        # Invoke Java Executor Lambda
        # -------------------------------------------------

        invoke_response = lambda_client.invoke(

            FunctionName=
                JAVA_EXECUTOR_FUNCTION_NAME,

            InvocationType=
                "RequestResponse",

            Payload=
                json.dumps(
                    payload
                ).encode("utf-8")
        )


        # -------------------------------------------------
        # Read Java Lambda response
        # -------------------------------------------------

        raw_payload = (
            invoke_response["Payload"]
            .read()
            .decode("utf-8")
        )


        if not raw_payload:

            return response(
                502,
                {
                    "success": False,
                    "questionId":
                        question_id,

                    "language":
                        "java",

                    "error": (
                        "Java executor returned "
                        "no response."
                    ),

                    "results": []
                }
            )


        java_result = json.loads(
            raw_payload
        )


        # -------------------------------------------------
        # Check Lambda-level failure
        # -------------------------------------------------

        if invoke_response.get(
            "FunctionError"
        ):

            return response(
                502,
                {
                    "success": False,
                    "questionId":
                        question_id,

                    "language":
                        "java",

                    "error":
                        java_result.get(
                            "errorMessage",
                            "Java executor Lambda failed."
                        ),

                    "results": []
                }
            )


        # -------------------------------------------------
        # Add standard fields
        # -------------------------------------------------

        java_result["questionId"] = (
            question_id
        )


        java_result["language"] = (
            "java"
        )


        if "results" not in java_result:

            java_result["results"] = []


        return response(
            200,
            java_result
        )


    except Exception as error:

        return response(
            502,
            {
                "success": False,
                "questionId":
                    question_id,

                "language":
                    "java",

                "error": (
                    "Unable to invoke Java executor: "
                    + str(error)
                ),

                "results": []
            }
        )


# =========================================================
# PYTHON EXECUTION
# =========================================================

def run_python_code(
    code,
    question,
    test_cases,
    execution_config
):

    # -----------------------------------------------------
    # Extract only allowed Python code
    # -----------------------------------------------------

    try:

        protected_code = (
            build_protected_python_code(
                code=code,
                question=question
            )
        )


    except ValueError as error:

        return [

            {
                "testCase":
                    test_case["id"],

                "passed":
                    False,

                "expected":
                    test_case["expectedOutput"],

                "actual":
                    None,

                "error":
                    str(error)
            }

            for test_case in test_cases
        ]


    results = []


    execution_id = str(
        uuid.uuid4()
    )


    with tempfile.TemporaryDirectory(
        prefix=
            f"code_editor_{execution_id}_"
    ) as temp_dir:


        user_code_file = os.path.join(
            temp_dir,
            "solution.py"
        )


        runner_file = os.path.join(
            temp_dir,
            "runner.py"
        )


        # -------------------------------------------------
        # Save protected solution
        # -------------------------------------------------

        with open(
            user_code_file,
            "w",
            encoding="utf-8"
        ) as file:

            file.write(
                protected_code
            )


        # -------------------------------------------------
        # Get generic Python execution config
        # -------------------------------------------------

        function_name = (
            execution_config[
                "methodName"
            ]
        )


        input_fields = (
            execution_config[
                "inputFields"
            ]
        )


        # -------------------------------------------------
        # Create protected runner
        # -------------------------------------------------

        runner_code = (
            create_python_runner(
                function_name,
                input_fields
            )
        )


        with open(
            runner_file,
            "w",
            encoding="utf-8"
        ) as file:

            file.write(
                runner_code
            )


        # -------------------------------------------------
        # Execute every test
        # -------------------------------------------------

        for test_case in test_cases:

            result = (
                execute_single_python_test(
                    runner_file=
                        runner_file,

                    test_case=
                        test_case,

                    working_directory=
                        temp_dir,

                    input_fields=
                        input_fields
                )
            )


            results.append(
                result
            )


    return results


# =========================================================
# DERIVE PYTHON EXECUTION CONFIG
# =========================================================

def derive_python_execution_config(
    question
):

    function_name = (
        get_python_function_name(
            question
        )
    )


    input_fields = (
        get_python_parameter_names(
            question
        )
    )


    if not input_fields:

        raise ValueError(
            "Python function parameters "
            "could not be determined."
        )


    return {

        "methodName":
            function_name,

        "parameterTypes":
            [],

        "inputFields":
            input_fields,

        "returnType":
            None
    }


# =========================================================
# BUILD PROTECTED PYTHON CODE
# =========================================================

def build_protected_python_code(
    code,
    question
):

    try:

        tree = ast.parse(
            code
        )


    except SyntaxError as error:

        raise ValueError(

            "Compilation error: "

            f"line {error.lineno}: "

            f"{error.msg}"
        )


    function_name = (
        get_python_function_name(
            question
        )
    )


    allowed_nodes = []

    target_function_found = False


    for node in tree.body:

        # -------------------------------------------------
        # Imports are allowed
        # -------------------------------------------------

        if isinstance(
            node,
            (
                ast.Import,
                ast.ImportFrom
            )
        ):

            allowed_nodes.append(
                node
            )

            continue


        # -------------------------------------------------
        # Function definitions are allowed
        # -------------------------------------------------

        if isinstance(
            node,
            (
                ast.FunctionDef,
                ast.AsyncFunctionDef
            )
        ):

            if node.name == function_name:

                if target_function_found:

                    raise ValueError(

                        f"Function '{function_name}' "
                        "is defined more than once."
                    )


                target_function_found = True


            allowed_nodes.append(
                node
            )

            continue


        # -------------------------------------------------
        # Everything else is protected
        # -------------------------------------------------

        raise ValueError(

            "Only imports and function definitions "
            "are allowed in the solution. "

            "The test runner is controlled by "
            "the backend."
        )


    if not target_function_found:

        raise ValueError(

            f"Required function '{function_name}' "
            "was not found in the submitted code."
        )


    # -----------------------------------------------------
    # Create new protected module
    # -----------------------------------------------------

    new_tree = ast.Module(

        body=
            allowed_nodes,

        type_ignores=[]
    )


    ast.fix_missing_locations(
        new_tree
    )


    try:

        protected_code = ast.unparse(
            new_tree
        )


    except Exception:

        protected_code = code


    return (
        protected_code
        + "\n"
    )


# =========================================================
# GET PYTHON FUNCTION NAME
# =========================================================

def get_python_function_name(
    question
):

    function_signature = (
        question.get(
            "functionSignature",
            {}
        )
    )


    if isinstance(
        function_signature,
        dict
    ):

        signature = (
            function_signature.get(
                "python",
                ""
            )
        )

    else:

        signature = ""


    if not signature:

        starter_code = (
            question.get(
                "starterCode",
                {}
            )
        )


        if isinstance(
            starter_code,
            dict
        ):

            starter = (
                starter_code.get(
                    "python",
                    ""
                )
            )

        else:

            starter = ""


        signature = (
            extract_python_function_name(
                starter
            )
        )


    if not signature:

        raise ValueError(
            "Python function signature "
            "is not configured."
        )


    return (
        extract_python_function_name(
            signature
        )
    )


# =========================================================
# GET PYTHON PARAMETER NAMES
# =========================================================

# =========================================================
# GET PYTHON PARAMETER NAMES
# =========================================================

def get_python_parameter_names(question):

    function_signature = question.get(
        "functionSignature",
        {}
    )

    if isinstance(function_signature, dict):

        signature = function_signature.get(
            "python",
            ""
        )

    else:

        signature = ""

    # -----------------------------------------------------
    # If functionSignature.python is not available,
    # use the Python starter code.
    # -----------------------------------------------------

    if not signature:

        starter_code = question.get(
            "starterCode",
            {}
        )

        if isinstance(starter_code, dict):

            signature = starter_code.get(
                "python",
                ""
            )

        else:

            signature = ""

    if not signature:

        raise ValueError(
            "Python function signature is not configured."
        )

    # -----------------------------------------------------
    # Support BOTH formats:
    #
    # 1. reverse_string(s)
    # 2. def reverse_string(s):
    # -----------------------------------------------------

    match = re.search(
        r"(?:def\s+)?"
        r"[A-Za-z_][A-Za-z0-9_]*"
        r"\s*\("
        r"(.*?)"
        r"\)",
        signature,
        re.DOTALL
    )

    if not match:

        raise ValueError(
            "Unable to determine Python function parameters."
        )

    parameter_text = (
        match.group(1).strip()
    )

    # -----------------------------------------------------
    # No parameters
    # -----------------------------------------------------

    if not parameter_text:

        return []

    names = []

    # -----------------------------------------------------
    # Extract each parameter
    # -----------------------------------------------------

    for parameter in parameter_text.split(","):

        parameter = parameter.strip()

        # Remove default value
        parameter = (
            parameter.split(
                "=",
                1
            )[0]
            .strip()
        )

        # Remove *args / **kwargs
        parameter = (
            parameter.lstrip("*")
        )

        # Remove type annotation
        if ":" in parameter:

            parameter = (
                parameter.split(
                    ":",
                    1
                )[0]
                .strip()
            )

        # Keep only valid parameter names
        if (
            parameter
            and parameter.isidentifier()
        ):

            names.append(
                parameter
            )

    return names


# =========================================================
# EXTRACT PYTHON FUNCTION NAME
# =========================================================

def extract_python_function_name(
    value
):

    value = value.strip()


    if "def " in value:

        value = value[
            value.index("def ") + 4:
        ]


    name = value.split(
        "(",
        1
    )[0].strip()


    if not name.isidentifier():

        raise ValueError(
            "Invalid Python function name configured."
        )


    return name


# =========================================================
# PYTHON TEST RUNNER
# =========================================================

def create_python_runner(
    function_name,
    input_fields
):

    arguments = ", ".join(

        f"inputs[{json.dumps(field)}]"

        for field in input_fields
    )


    runner = f"""

import json
import sys

from solution import {function_name}


def run_test(inputs):

    result = {function_name}(
        {arguments}
    )

    print(
        json.dumps(
            result,
            separators=(",", ":")
        )
    )


if __name__ == "__main__":

    inputs = json.loads(
        sys.argv[1]
    )

    run_test(
        inputs
    )

"""


    return textwrap.dedent(
        runner
    )


# =========================================================
# EXECUTE ONE PYTHON TEST
# =========================================================

def execute_single_python_test(
    runner_file,
    test_case,
    working_directory,
    input_fields
):

    test_id = test_case[
        "id"
    ]


    input_data = test_case[
        "input"
    ]


    expected_output = test_case[
        "expectedOutput"
    ]


    try:

        process = subprocess.run(

            [

                sys.executable,

                runner_file,

                json.dumps(
                    input_data
                )

            ],

            cwd=
                working_directory,

            capture_output=
                True,

            text=
                True,

            timeout=
                EXECUTION_TIMEOUT,

            env=
                create_safe_environment()
        )


        # -------------------------------------------------
        # Runtime error
        # -------------------------------------------------

        if process.returncode != 0:

            error_message = (

                process.stderr.strip()

                or

                process.stdout.strip()

                or

                "Program exited with an error"
            )


            return {

                "testCase":
                    test_id,

                "passed":
                    False,

                "expected":
                    expected_output,

                "actual":
                    None,

                "error":
                    error_message
            }


        # -------------------------------------------------
        # Empty output
        # -------------------------------------------------

        output = (
            process.stdout.strip()
        )


        if not output:

            return {

                "testCase":
                    test_id,

                "passed":
                    False,

                "expected":
                    expected_output,

                "actual":
                    None,

                "error":
                    "Program produced no output"
            }


        # -------------------------------------------------
        # Parse output
        # -------------------------------------------------

        actual_output = json.loads(

            output.splitlines()[-1]

        )


        # -------------------------------------------------
        # Compare output
        # -------------------------------------------------

        passed = (

            normalize_output(
                actual_output
            )

            ==

            normalize_output(
                expected_output
            )
        )


        result = {

            "testCase":
                test_id,

            "passed":
                passed,

            "expected":
                expected_output,

            "actual":
                actual_output
        }


        if not passed:

            result["error"] = (
                "Output does not match "
                "expected result."
            )


        return result


    except subprocess.TimeoutExpired:

        return {

            "testCase":
                test_id,

            "passed":
                False,

            "expected":
                expected_output,

            "actual":
                None,

            "error": (
                f"Execution timed out after "
                f"{EXECUTION_TIMEOUT} seconds"
            )
        }


    except json.JSONDecodeError:

        return {

            "testCase":
                test_id,

            "passed":
                False,

            "expected":
                expected_output,

            "actual":
                None,

            "error":
                "Program returned invalid output"
        }


    except Exception as error:

        return {

            "testCase":
                test_id,

            "passed":
                False,

            "expected":
                expected_output,

            "actual":
                None,

            "error":
                str(error)
        }


# =========================================================
# NORMALIZE OUTPUT
# =========================================================

def normalize_output(
    value
):

    if isinstance(
        value,
        list
    ):

        try:

            return sorted(
                value
            )

        except TypeError:

            return value


    return value


# =========================================================
# SAFE ENVIRONMENT FOR PYTHON
# =========================================================

def create_safe_environment():

    return {

        "PATH":
            os.environ.get(
                "PATH",
                ""
            ),

        "PYTHONUNBUFFERED":
            "1",

        "PYTHONDONTWRITEBYTECODE":
            "1"
    }


# =========================================================
# READ API GATEWAY REQUEST BODY
# =========================================================

def get_request_body(
    event
):

    body = event.get(
        "body",
        "{}"
    )


    if isinstance(
        body,
        str
    ):

        if event.get(
            "isBase64Encoded"
        ):

            import base64


            body = base64.b64decode(
                body
            ).decode(
                "utf-8"
            )


        return json.loads(
            body
        )


    if isinstance(
        body,
        dict
    ):

        return body


    return {}


# =========================================================
# STANDARD API RESPONSE
# =========================================================

def response(
    status_code,
    body
):

    return {

        "statusCode":
            status_code,

        "headers": {

            "Content-Type":
                "application/json",

            "Access-Control-Allow-Origin":
                "*",

            "Access-Control-Allow-Headers":
                "Content-Type,Authorization",

            "Access-Control-Allow-Methods":
                "GET,POST,OPTIONS"
        },

        "body":
            json.dumps(
                body
            )
    }