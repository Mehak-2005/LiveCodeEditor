package com.example;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

public class JavaExecutor implements RequestHandler<
        Map<String, Object>,
        Map<String, Object>> {

    private static final int EXECUTION_TIMEOUT_SECONDS = 3;

    // =========================================================
    // LAMBDA ENTRY POINT
    // =========================================================

    @Override
    public Map<String, Object> handleRequest(
            Map<String, Object> event,
            Context context) {

        Map<String, Object> response = new HashMap<>();

        Path tempDirectory = null;

        try {

            // -------------------------------------------------
            // Read request
            // -------------------------------------------------

            String code = getString(event, "code");
            String starterCode = getString(event, "starterCode");
            String functionSignature = getString(event, "functionSignature");

            Object testCasesObject = event.get("testCases");
            Object executionObject = event.get("execution");

            if (code == null || code.trim().isEmpty()) {
                return errorResponse("Java code is required.");
            }

            if (starterCode == null || starterCode.trim().isEmpty()) {
                return errorResponse("Java starter code is required.");
            }

            if (!(testCasesObject instanceof List<?>)) {
                return errorResponse("Test cases are required.");
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> testCases =
                    (List<Map<String, Object>>) testCasesObject;

            // -------------------------------------------------
            // Read execution configuration
            // -------------------------------------------------

            Map<String, Object> execution =
                    normalizeMap(executionObject);

            if (execution.isEmpty()) {

                /*
                 * Temporary backwards-compatible configuration.
                 *
                 * This allows the current Two Sum request to continue
                 * working while run_code/app.py is being updated.
                 */
                execution = createLegacyTwoSumExecution(
                        functionSignature
                );
            }

            String methodName =
                    getString(execution, "methodName");

            String returnType =
                    getString(execution, "returnType");

            List<String> parameterTypes =
                    getStringList(
                            execution.get("parameterTypes")
                    );

            List<String> inputFields =
                    getStringList(
                            execution.get("inputFields")
                    );

            if (methodName == null || methodName.isBlank()) {
                return errorResponse(
                        "Execution configuration is missing methodName."
                );
            }

            if (parameterTypes.isEmpty()) {
                return errorResponse(
                        "Execution configuration is missing parameterTypes."
                );
            }

            if (inputFields.isEmpty()) {
                return errorResponse(
                        "Execution configuration is missing inputFields."
                );
            }

            if (parameterTypes.size() != inputFields.size()) {
                return errorResponse(
                        "parameterTypes and inputFields must have the same size."
                );
            }

            // -------------------------------------------------
            // Build protected Main.java
            // -------------------------------------------------

            String protectedMainCode =
                    buildProtectedMainCode(
                            code,
                            starterCode,
                            methodName
                    );

            // -------------------------------------------------
            // Create temporary directory
            // -------------------------------------------------

            tempDirectory =
                    Files.createTempDirectory("java-code-");

            try {

                // =================================================
                // 1. Write backend-controlled Main.java
                // =================================================

                Path mainFile =
                        tempDirectory.resolve("Main.java");

                Files.writeString(
                        mainFile,
                        protectedMainCode,
                        StandardCharsets.UTF_8,
                        StandardOpenOption.CREATE,
                        StandardOpenOption.TRUNCATE_EXISTING
                );

                // =================================================
                // 2. Compile Main.java
                // =================================================

                ProcessBuilder compileBuilder =
                        new ProcessBuilder(
                                "javac",
                                "Main.java"
                        );

                compileBuilder.directory(
                        tempDirectory.toFile()
                );

                compileBuilder.redirectErrorStream(true);

                Process compileProcess =
                        compileBuilder.start();

                String compileOutput =
                        readProcessOutput(compileProcess);

                boolean compileFinished =
                        compileProcess.waitFor(
                                EXECUTION_TIMEOUT_SECONDS,
                                TimeUnit.SECONDS
                        );

                if (!compileFinished) {

                    compileProcess.destroyForcibly();

                    response.put("success", false);
                    response.put("status", "COMPILE_ERROR");
                    response.put(
                            "error",
                            "Compilation timed out."
                    );
                    response.put(
                            "compileError",
                            "Compilation timed out."
                    );
                    response.put(
                            "results",
                            new ArrayList<>()
                    );

                    return response;
                }

                if (compileProcess.exitValue() != 0) {

                    response.put("success", false);
                    response.put("status", "COMPILE_ERROR");
                    response.put(
                            "error",
                            "Compilation error."
                    );
                    response.put(
                            "compileError",
                            compileOutput
                    );
                    response.put(
                            "results",
                            new ArrayList<>()
                    );

                    return response;
                }

                // =================================================
                // 3. Execute protected test cases
                // =================================================

                List<Map<String, Object>> results =
                        new ArrayList<>();

                int passed = 0;

                for (int i = 0; i < testCases.size(); i++) {

                    Map<String, Object> testCase =
                            testCases.get(i);

                    Map<String, Object> result =
                            executeTestCase(
                                    tempDirectory,
                                    testCase,
                                    i + 1,
                                    methodName,
                                    parameterTypes,
                                    inputFields,
                                    returnType
                            );

                    results.add(result);

                    if (Boolean.TRUE.equals(
                            result.get("passed"))) {

                        passed++;
                    }
                }

                // =================================================
                // 4. Final response
                // =================================================

                response.put(
                        "success",
                        passed == testCases.size()
                );

                response.put(
                        "status",
                        "TEST_RESULT"
                );

                response.put(
                        "totalTests",
                        testCases.size()
                );

                response.put(
                        "passedTests",
                        passed
                );

                response.put(
                        "failedTests",
                        testCases.size() - passed
                );

                response.put(
                        "results",
                        results
                );

                return response;

            } finally {

                if (tempDirectory != null) {
                    deleteDirectory(tempDirectory);
                }
            }

        } catch (Exception e) {

            return errorResponse(
                    "Java execution failed: " +
                    safeMessage(e)
            );
        }
    }

    // =========================================================
    // BUILD PROTECTED MAIN.JAVA
    // =========================================================

    private String buildProtectedMainCode(
            String userCode,
            String starterCode,
            String requiredMethodName
    ) throws Exception {

        // -----------------------------------------------------
        // Extract method from trusted starter
        // -----------------------------------------------------

        MethodInfo expectedMethod =
                extractMethodInfo(starterCode);

        if (expectedMethod == null) {

            throw new Exception(
                    "Unable to determine the required Java method "
                    + "from starter code."
            );
        }

        // -----------------------------------------------------
        // Make sure trusted method matches configuration
        // -----------------------------------------------------

        if (!expectedMethod.name.equals(
                requiredMethodName)) {

            throw new Exception(
                    "Execution configuration methodName does not "
                    + "match the trusted starter method."
            );
        }

        // -----------------------------------------------------
        // Extract student's method
        // -----------------------------------------------------

        MethodInfo submittedMethod =
                extractMethodInfo(userCode);

        if (submittedMethod == null) {

            throw new Exception(
                    "Required solution method was not found."
            );
        }

        // -----------------------------------------------------
        // Student cannot change method name
        // -----------------------------------------------------

        if (!expectedMethod.name.equals(
                submittedMethod.name)) {

            throw new Exception(
                    "Invalid method name. Use the method provided "
                    + "in the question."
            );
        }

        // -----------------------------------------------------
        // Student method declaration is NOT trusted.
        //
        // We use:
        //   declaration from starter
        //
        // We use:
        //   body from student
        // -----------------------------------------------------

        String imports =
                extractImports(starterCode);

        StringBuilder builder =
                new StringBuilder();

        if (!imports.isBlank()) {

            builder.append(imports);
            builder.append("\n\n");
        }

        builder.append(
                "public class Main {\n\n"
        );

        builder.append(
                "    "
        );

        builder.append(
                expectedMethod.declaration
        );

        builder.append(
                " {\n"
        );

        builder.append(
                submittedMethod.body
        );

        builder.append(
                "\n    }\n"
        );

        builder.append(
                "}\n"
        );

        return builder.toString();
    }

    // =========================================================
    // METHOD INFORMATION
    // =========================================================

    private static class MethodInfo {

        String name;
        String declaration;
        String body;
    }

    // =========================================================
    // EXTRACT METHOD
    // =========================================================

    private MethodInfo extractMethodInfo(
            String source
    ) throws Exception {

        if (source == null || source.isBlank()) {
            return null;
        }

        String searchSource =
                removeComments(source);

        /*
         * Finds Java method declarations such as:
         *
         * public static int[] twoSum(
         *     int[] nums,
         *     int target
         * )
         * {
         */
        Pattern methodPattern =
                Pattern.compile(
                        "(public|protected|private)?\\s*"
                        + "(static\\s+)?"
                        + "([\\w<>\\[\\], ?]+?)\\s+"
                        + "([A-Za-z_$][A-Za-z0-9_$]*)"
                        + "\\s*\\("
                        + "[^;{}]*"
                        + "\\)\\s*\\{",
                        Pattern.MULTILINE
                );

        Matcher matcher =
                methodPattern.matcher(searchSource);

        while (matcher.find()) {

            String methodName =
                    matcher.group(4);

            // -------------------------------------------------
            // NEVER accept main()
            // -------------------------------------------------

            if ("main".equals(methodName)) {
                continue;
            }

            int openingBrace =
                    searchSource.indexOf(
                            "{",
                            matcher.start()
                    );

            if (openingBrace < 0) {
                continue;
            }

            int closingBrace =
                    findMatchingBrace(
                            searchSource,
                            openingBrace
                    );

            if (closingBrace < 0) {
                continue;
            }

            int originalOpeningBrace =
                    findOriginalOpeningBrace(
                            source,
                            matcher.start()
                    );

            if (originalOpeningBrace < 0) {
                continue;
            }

            int originalClosingBrace =
                    findMatchingBrace(
                            source,
                            originalOpeningBrace
                    );

            if (originalClosingBrace < 0) {
                continue;
            }

            String declaration =
                    source.substring(
                            matcher.start(),
                            originalOpeningBrace
                    ).trim();

            String body =
                    source.substring(
                            originalOpeningBrace + 1,
                            originalClosingBrace
                    ).trim();

            MethodInfo info =
                    new MethodInfo();

            info.name = methodName;
            info.declaration = declaration;
            info.body = indentBody(body);

            return info;
        }

        return null;
    }

    // =========================================================
    // FIND MATCHING BRACE
    // =========================================================

    private int findMatchingBrace(
            String source,
            int openingBrace
    ) {

        int depth = 0;

        boolean inString = false;
        boolean inChar = false;
        boolean escaped = false;

        for (
                int i = openingBrace;
                i < source.length();
                i++
        ) {

            char current =
                    source.charAt(i);

            if (escaped) {

                escaped = false;
                continue;
            }

            if (
                    (inString || inChar)
                    &&
                    current == '\\'
            ) {

                escaped = true;
                continue;
            }

            if (
                    !inChar
                    &&
                    current == '"'
            ) {

                inString = !inString;
                continue;
            }

            if (
                    !inString
                    &&
                    current == '\''
            ) {

                inChar = !inChar;
                continue;
            }

            if (inString || inChar) {
                continue;
            }

            if (current == '{') {
                depth++;
            }

            if (current == '}') {

                depth--;

                if (depth == 0) {
                    return i;
                }
            }
        }

        return -1;
    }

    // =========================================================
    // FIND ORIGINAL OPENING BRACE
    // =========================================================

    private int findOriginalOpeningBrace(
            String source,
            int methodStart
    ) {

        return source.indexOf(
                "{",
                methodStart
        );
    }

    // =========================================================
    // INDENT METHOD BODY
    // =========================================================

    private String indentBody(String body) {

        if (body == null || body.isBlank()) {
            return "        ";
        }

        String[] lines =
                body.split("\\R");

        StringBuilder result =
                new StringBuilder();

        for (String line : lines) {

            result.append("        ");
            result.append(line);
            result.append("\n");
        }

        return result.toString().stripTrailing();
    }

    // =========================================================
    // REMOVE COMMENTS
    // =========================================================

    private String removeComments(String source) {

        return source
                .replaceAll(
                        "(?s)/\\*.*?\\*/",
                        ""
                )
                .replaceAll(
                        "(?m)//.*$",
                        ""
                );
    }

    // =========================================================
    // EXTRACT IMPORTS
    // =========================================================

    private String extractImports(String source) {

        StringBuilder imports =
                new StringBuilder();

        Pattern pattern =
                Pattern.compile(
                        "(?m)^\\s*import\\s+[^;]+;"
                );

        Matcher matcher =
                pattern.matcher(source);

        while (matcher.find()) {

            imports.append(
                    matcher.group().trim()
            );

            imports.append("\n");
        }

        return imports.toString().trim();
    }

    // =========================================================
    // EXECUTE ONE TEST CASE
    // =========================================================

    private Map<String, Object> executeTestCase(
            Path tempDirectory,
            Map<String, Object> testCase,
            int testNumber,
            String methodName,
            List<String> parameterTypes,
            List<String> inputFields,
            String returnType
    ) {

        Map<String, Object> result =
                new HashMap<>();

        result.put(
                "testCase",
                testCase.getOrDefault(
                        "id",
                        testNumber
                )
        );

        try {

            Object expected =
                    testCase.get("expected");

            if (expected == null) {
                expected = testCase.get("expectedOutput");
            }

            Object inputObject =
                    testCase.get("input");

            Map<String, Object> input =
                    normalizeMap(inputObject);

            /*
             * Backwards compatibility:
             *
             * Current run_code.py sends:
             *
             * {
             *   "nums": [...],
             *   "target": 9,
             *   "expected": [...]
             * }
             */
            if (input.isEmpty()) {

                for (String field : inputFields) {

                    if (testCase.containsKey(field)) {

                        input.put(
                                field,
                                testCase.get(field)
                        );
                    }
                }
            }

            // -------------------------------------------------
            // Validate all required inputs
            // -------------------------------------------------

            for (String field : inputFields) {

                if (!input.containsKey(field)) {

                    result.put("passed", false);

                    result.put(
                            "error",
                            "Missing test input field: "
                            + field
                    );

                    return result;
                }
            }

            // -------------------------------------------------
            // Build backend-controlled Runner.java
            // -------------------------------------------------

            String runnerCode =
                    createRunnerCode(
                            methodName,
                            parameterTypes,
                            inputFields,
                            returnType,
                            input
                    );

            Path runnerFile =
                    tempDirectory.resolve(
                            "Runner.java"
                    );

            Files.writeString(
                    runnerFile,
                    runnerCode,
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING
            );

            // -------------------------------------------------
            // Compile protected Runner.java
            // -------------------------------------------------

            ProcessBuilder compileRunnerBuilder =
                    new ProcessBuilder(
                            "javac",
                            "-cp",
                            ".",
                            "Runner.java"
                    );

            compileRunnerBuilder.directory(
                    tempDirectory.toFile()
            );

            compileRunnerBuilder.redirectErrorStream(true);

            Process compileRunnerProcess =
                    compileRunnerBuilder.start();

            String compileOutput =
                    readProcessOutput(
                            compileRunnerProcess
                    );

            boolean compileFinished =
                    compileRunnerProcess.waitFor(
                            EXECUTION_TIMEOUT_SECONDS,
                            TimeUnit.SECONDS
                    );

            if (!compileFinished) {

                compileRunnerProcess.destroyForcibly();

                result.put("passed", false);
                result.put(
                        "error",
                        "Test runner compilation timed out."
                );

                return result;
            }

            if (compileRunnerProcess.exitValue() != 0) {

                result.put("passed", false);

                result.put(
                        "error",
                        "Backend runner compilation failed: "
                        + compileOutput
                );

                return result;
            }

            // -------------------------------------------------
            // Run backend-controlled Runner
            // -------------------------------------------------

            ProcessBuilder runBuilder =
                    new ProcessBuilder(
                            "java",
                            "-cp",
                            ".",
                            "Runner"
                    );

            runBuilder.directory(
                    tempDirectory.toFile()
            );

            runBuilder.redirectErrorStream(true);

            Process runProcess =
                    runBuilder.start();

            String output =
                    readProcessOutput(
                            runProcess
                    );

            boolean finished =
                    runProcess.waitFor(
                            EXECUTION_TIMEOUT_SECONDS,
                            TimeUnit.SECONDS
                    );

            if (!finished) {

                runProcess.destroyForcibly();

                result.put("passed", false);
                result.put(
                        "expected",
                        expected
                );
                result.put(
                        "actual",
                        null
                );
                result.put(
                        "error",
                        "Execution timed out."
                );

                return result;
            }

            if (runProcess.exitValue() != 0) {

                result.put("passed", false);
                result.put(
                        "expected",
                        expected
                );
                result.put(
                        "actual",
                        null
                );
                result.put(
                        "error",
                        output
                );

                return result;
            }

            // -------------------------------------------------
            // Normalize output
            // -------------------------------------------------

            String actual =
                    normalizeOutput(output);

            String expectedNormalized =
                    normalizeExpected(expected);

            boolean passed =
                    actual.equals(
                            expectedNormalized
                    );

            result.put(
                    "passed",
                    passed
            );

            result.put(
                    "expected",
                    expected
            );

            result.put(
                    "actual",
                    parseOutputForResponse(
                            actual,
                            returnType
                    )
            );

            if (!passed) {

                result.put(
                        "error",
                        "Output does not match expected result."
                );
            }

            return result;

        } catch (Exception e) {

            result.put(
                    "passed",
                    false
            );

            result.put(
                    "error",
                    "Runtime error: "
                    + safeMessage(e)
            );

            return result;
        }
    }

    // =========================================================
    // CREATE PROTECTED RUNNER
    // =========================================================

    private String createRunnerCode(
            String methodName,
            List<String> parameterTypes,
            List<String> inputFields,
            String returnType,
            Map<String, Object> input
    ) throws Exception {

        StringBuilder code =
                new StringBuilder();

        code.append(
                "public class Runner {\n\n"
        );

        code.append(
                "    public static void main(String[] args) {\n"
        );

        code.append(
                "        try {\n"
        );

        // -----------------------------------------------------
        // Create arguments
        // -----------------------------------------------------

        List<String> arguments =
                new ArrayList<>();

        for (int i = 0;
             i < parameterTypes.size();
             i++) {

            String parameterType =
                    parameterTypes.get(i);

            String fieldName =
                    inputFields.get(i);

            Object value =
                    input.get(fieldName);

            String variableName =
                    "arg" + i;

            String declaration =
                    createVariableDeclaration(
                            parameterType,
                            variableName,
                            value
                    );

            code.append(
                    "            "
            );

            code.append(declaration);

            code.append("\n");

            arguments.add(variableName);
        }

        // -----------------------------------------------------
        // Call student's protected solution method
        // -----------------------------------------------------

        String call =
                "Main."
                + methodName
                + "("
                + String.join(
                        ", ",
                        arguments
                )
                + ")";

        code.append(
                "            "
        );

        code.append(
                createResultHandling(
                        returnType,
                        call
                )
        );

        code.append("\n");

        code.append(
                "        } catch (Exception e) {\n"
        );

        code.append(
                "            e.printStackTrace();\n"
        );

        code.append(
                "            System.exit(1);\n"
        );

        code.append(
                "        }\n"
        );

        code.append(
                "    }\n"
        );

        code.append(
                "}\n"
        );

        return code.toString();
    }

    // =========================================================
    // CREATE JAVA INPUT VARIABLE
    // =========================================================

    private String createVariableDeclaration(
            String type,
            String variableName,
            Object value
    ) throws Exception {

        type = normalizeType(type);

        if ("int".equals(type)) {

            return "int "
                    + variableName
                    + " = "
                    + asInt(value)
                    + ";";
        }

        if ("long".equals(type)) {

            return "long "
                    + variableName
                    + " = "
                    + asLong(value)
                    + "L;";
        }

        if ("double".equals(type)) {

            return "double "
                    + variableName
                    + " = "
                    + asDouble(value)
                    + ";";
        }

        if ("float".equals(type)) {

            return "float "
                    + variableName
                    + " = "
                    + asDouble(value)
                    + "f;";
        }

        if ("boolean".equals(type)) {

            return "boolean "
                    + variableName
                    + " = "
                    + asBoolean(value)
                    + ";";
        }

        if ("String".equals(type)) {

            return "String "
                    + variableName
                    + " = "
                    + quoteJavaString(
                            String.valueOf(value)
                    )
                    + ";";
        }

        if ("int[]".equals(type)) {

            return "int[] "
                    + variableName
                    + " = "
                    + intArrayLiteral(value)
                    + ";";
        }

        if ("long[]".equals(type)) {

            return "long[] "
                    + variableName
                    + " = "
                    + longArrayLiteral(value)
                    + ";";
        }

        if ("double[]".equals(type)) {

            return "double[] "
                    + variableName
                    + " = "
                    + doubleArrayLiteral(value)
                    + ";";
        }

        if ("String[]".equals(type)) {

            return "String[] "
                    + variableName
                    + " = "
                    + stringArrayLiteral(value)
                    + ";";
        }

        throw new Exception(
                "Unsupported Java parameter type: "
                + type
        );
    }

    // =========================================================
    // CREATE RESULT HANDLING
    // =========================================================

    private String createResultHandling(
            String returnType,
            String call
    ) throws Exception {

        String type =
                normalizeType(returnType);

        if ("void".equals(type)) {

            return call + ";";
        }

        StringBuilder result =
                new StringBuilder();

        result.append(
                type
        );

        result.append(
                " result = "
        );

        result.append(
                call
        );

        result.append(
                ";\n"
        );

        result.append(
                "            "
        );

        if ("int[]".equals(type)) {

            result.append(
                    "System.out.println("
                    + "java.util.Arrays.toString(result)"
                    + ");"
            );

        } else if ("long[]".equals(type)) {

            result.append(
                    "System.out.println("
                    + "java.util.Arrays.toString(result)"
                    + ");"
            );

        } else if ("double[]".equals(type)) {

            result.append(
                    "System.out.println("
                    + "java.util.Arrays.toString(result)"
                    + ");"
            );

        } else if ("String[]".equals(type)) {

            result.append(
                    "System.out.println("
                    + "java.util.Arrays.toString(result)"
                    + ");"
            );

        } else if ("String".equals(type)) {

            result.append(
                    "System.out.println(result == null "
                    + "? \"null\" : result);"
            );

        } else {

            result.append(
                    "System.out.println(result);"
            );
        }

        return result.toString();
    }

    // =========================================================
    // OUTPUT NORMALIZATION
    // =========================================================

    private String normalizeOutput(String output) {

        if (output == null) {
            return "";
        }

        String cleaned =
                output.trim();

        if (cleaned.startsWith("[")
                && cleaned.endsWith("]")) {

            cleaned =
                    cleaned.substring(
                            1,
                            cleaned.length() - 1
                    ).trim();
        }

        cleaned =
                cleaned.replaceAll(
                        "\\s+",
                        ""
                );

        return cleaned;
    }

    private String normalizeExpected(Object expected) {

        if (expected == null) {
            return "null";
        }

        if (expected instanceof List<?>) {

            List<?> list =
                    (List<?>) expected;

            StringBuilder builder =
                    new StringBuilder();

            for (int i = 0;
                 i < list.size();
                 i++) {

                if (i > 0) {
                    builder.append(",");
                }

                builder.append(
                        String.valueOf(
                                list.get(i)
                        )
                );
            }

            return builder.toString();
        }

        return String.valueOf(expected)
                .trim()
                .replaceAll("\\s+", "");
    }

    private Object parseOutputForResponse(
            String output,
            String returnType
    ) {

        String type =
                normalizeType(returnType);

        if (output == null
                || output.equals("null")) {

            return null;
        }

        if (type.endsWith("[]")) {

            List<Object> values =
                    new ArrayList<>();

            if (output.isBlank()) {
                return values;
            }

            String cleaned =
                    output.trim();

            if (cleaned.startsWith("[")
                    && cleaned.endsWith("]")) {

                cleaned =
                        cleaned.substring(
                                1,
                                cleaned.length() - 1
                        );
            }

            if (cleaned.isBlank()) {
                return values;
            }

            String[] parts =
                    cleaned.split(",");

            for (String part : parts) {

                String value =
                        part.trim();

                if (type.equals("String[]")) {

                    values.add(value);

                } else if (
                        type.equals("double[]")
                ) {

                    values.add(
                            Double.parseDouble(value)
                    );

                } else {

                    values.add(
                            Integer.parseInt(value)
                    );
                }
            }

            return values;
        }

        if ("int".equals(type)) {
            return Integer.parseInt(output);
        }

        if ("long".equals(type)) {
            return Long.parseLong(output);
        }

        if ("double".equals(type)) {
            return Double.parseDouble(output);
        }

        if ("boolean".equals(type)) {
            return Boolean.parseBoolean(output);
        }

        return output;
    }

    // =========================================================
    // ARRAY LITERALS
    // =========================================================

    private String intArrayLiteral(
            Object value
    ) throws Exception {

        List<?> list =
                asList(value);

        StringBuilder builder =
                new StringBuilder();

        builder.append("new int[]{");

        for (int i = 0;
             i < list.size();
             i++) {

            if (i > 0) {
                builder.append(",");
            }

            builder.append(
                    asInt(list.get(i))
            );
        }

        builder.append("}");

        return builder.toString();
    }

    private String longArrayLiteral(
            Object value
    ) throws Exception {

        List<?> list =
                asList(value);

        StringBuilder builder =
                new StringBuilder();

        builder.append("new long[]{");

        for (int i = 0;
             i < list.size();
             i++) {

            if (i > 0) {
                builder.append(",");
            }

            builder.append(
                    asLong(list.get(i))
            );

            builder.append("L");
        }

        builder.append("}");

        return builder.toString();
    }

    private String doubleArrayLiteral(
            Object value
    ) throws Exception {

        List<?> list =
                asList(value);

        StringBuilder builder =
                new StringBuilder();

        builder.append("new double[]{");

        for (int i = 0;
             i < list.size();
             i++) {

            if (i > 0) {
                builder.append(",");
            }

            builder.append(
                    asDouble(list.get(i))
            );
        }

        builder.append("}");

        return builder.toString();
    }

    private String stringArrayLiteral(
            Object value
    ) throws Exception {

        List<?> list =
                asList(value);

        StringBuilder builder =
                new StringBuilder();

        builder.append("new String[]{");

        for (int i = 0;
             i < list.size();
             i++) {

            if (i > 0) {
                builder.append(",");
            }

            builder.append(
                    quoteJavaString(
                            String.valueOf(
                                    list.get(i)
                            )
                    )
            );
        }

        builder.append("}");

        return builder.toString();
    }

    // =========================================================
    // LEGACY TWO SUM CONFIG
    // =========================================================

    private Map<String, Object> createLegacyTwoSumExecution(
            String functionSignature
    ) {

        Map<String, Object> execution =
                new HashMap<>();

        String methodName =
                "twoSum";

        if (functionSignature != null
                && functionSignature.contains("(")) {

            String signature =
                    functionSignature.trim();

            int open =
                    signature.indexOf("(");

            if (open > 0) {

                methodName =
                        signature.substring(
                                0,
                                open
                        ).trim();
            }
        }

        execution.put(
                "methodName",
                methodName
        );

        List<String> parameterTypes =
                new ArrayList<>();

        parameterTypes.add("int[]");
        parameterTypes.add("int");

        execution.put(
                "parameterTypes",
                parameterTypes
        );

        execution.put(
                "returnType",
                "int[]"
        );

        List<String> inputFields =
                new ArrayList<>();

        inputFields.add("nums");
        inputFields.add("target");

        execution.put(
                "inputFields",
                inputFields
        );

        return execution;
    }

    // =========================================================
    // MAP HELPERS
    // =========================================================

    private Map<String, Object> normalizeMap(
            Object object
    ) {

        if (!(object instanceof Map<?, ?>)) {
            return new HashMap<>();
        }

        Map<?, ?> original =
                (Map<?, ?>) object;

        Map<String, Object> result =
                new HashMap<>();

        for (
                Map.Entry<?, ?> entry :
                original.entrySet()
        ) {

            if (entry.getKey() == null) {
                continue;
            }

            result.put(
                    String.valueOf(
                            entry.getKey()
                    ),
                    entry.getValue()
            );
        }

        return result;
    }

    private String getString(
            Map<String, Object> map,
            String key
    ) {

        Object value =
                map.get(key);

        return value == null
                ? null
                : String.valueOf(value);
    }

    private List<String> getStringList(
            Object value
    ) {

        List<String> result =
                new ArrayList<>();

        if (!(value instanceof List<?>)) {
            return result;
        }

        for (Object item :
                (List<?>) value) {

            if (item != null) {

                result.add(
                        String.valueOf(item)
                );
            }
        }

        return result;
    }

    private List<?> asList(
            Object value
    ) throws Exception {

        if (!(value instanceof List<?>)) {

            throw new Exception(
                    "Expected an array/list input."
            );
        }

        return (List<?>) value;
    }

    private String normalizeType(
            String type
    ) {

        if (type == null) {
            return "";
        }

        return type
                .trim()
                .replaceAll(
                        "\\s+",
                        ""
                );
    }

    // =========================================================
    // TYPE CONVERSION
    // =========================================================

    private int asInt(
            Object value
    ) throws Exception {

        if (value instanceof Number) {

            return ((Number) value)
                    .intValue();
        }

        return Integer.parseInt(
                String.valueOf(value)
        );
    }

    private long asLong(
            Object value
    ) throws Exception {

        if (value instanceof Number) {

            return ((Number) value)
                    .longValue();
        }

        return Long.parseLong(
                String.valueOf(value)
        );
    }

    private double asDouble(
            Object value
    ) throws Exception {

        if (value instanceof Number) {

            return ((Number) value)
                    .doubleValue();
        }

        return Double.parseDouble(
                String.valueOf(value)
        );
    }

    private boolean asBoolean(
            Object value
    ) {

        if (value instanceof Boolean) {
            return (Boolean) value;
        }

        return Boolean.parseBoolean(
                String.valueOf(value)
        );
    }

    private String quoteJavaString(
            String value
    ) {

        if (value == null) {
            return "null";
        }

        return "\""
                + value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
                + "\"";
    }

    // =========================================================
    // PROCESS OUTPUT
    // =========================================================

    private String readProcessOutput(
            Process process
    ) throws IOException {

        BufferedReader reader =
                new BufferedReader(
                        new InputStreamReader(
                                process.getInputStream(),
                                StandardCharsets.UTF_8
                        )
                );

        StringBuilder output =
                new StringBuilder();

        String line;

        while (
                (line = reader.readLine())
                        != null
        ) {

            output.append(line);
            output.append(
                    System.lineSeparator()
            );
        }

        return output.toString().trim();
    }

    // =========================================================
    // ERROR RESPONSE
    // =========================================================

    private Map<String, Object> errorResponse(
            String message
    ) {

        Map<String, Object> response =
                new HashMap<>();

        response.put(
                "success",
                false
        );

        response.put(
                "status",
                "ERROR"
        );

        response.put(
                "error",
                message
        );

        response.put(
                "results",
                new ArrayList<>()
        );

        return response;
    }

    // =========================================================
    // SAFE ERROR MESSAGE
    // =========================================================

    private String safeMessage(
            Exception e
    ) {

        if (e == null) {
            return "Unknown error.";
        }

        String message =
                e.getMessage();

        if (message == null
                || message.isBlank()) {

            return e.getClass()
                    .getSimpleName();
        }

        return message;
    }

    // =========================================================
    // DELETE TEMP DIRECTORY
    // =========================================================

    private void deleteDirectory(
            Path directory
    ) {

        if (directory == null) {
            return;
        }

        try {

            if (!Files.exists(directory)) {
                return;
            }

            Files.walk(directory)
                    .sorted(
                            (a, b) ->
                                    b.compareTo(a)
                    )
                    .forEach(
                            path -> {

                                try {

                                    Files.deleteIfExists(
                                            path
                                    );

                                } catch (IOException ignored) {
                                }
                            }
                    );

        } catch (IOException ignored) {
        }
    }
}